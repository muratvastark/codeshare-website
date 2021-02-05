const { Router, static } = require("express");
const { format } = require("url");
const router = Router();
const moment = require("moment");
moment.locale('tr');

module.exports = (client) => {
    router.get("/", async (req, res) => {
        let codes = await client.database.models.codes.find({ codeCategory: "altin" }).sort('-uploadDate').exec() || [];

		let users = {};
        codes = await Promise.all(codes.map(async code => {
			let user;
			if(users[code.sharerID]) user = users[code.sharerID];
            else {
				user = await client.users.fetch(code.sharerID);
				users[code.sharerID] = {
                    id: user.id,
                    username: user.username,
                    avatar: user.displayAvatarURL({ dynamic: true })
                };
			}
			
            return {
                codeName: code.codeName,
                codeDesc: code.codeDesc,
                codeID: code.codeID,
                codeCategory: code.codeCategory,
                uploadDate: code.uploadDate,
                sharer: users[code.sharerID]
            };
        }));


        res.render("kodlar", {
            client,
            user: req.user,
            brand: client.guilds.cache.get(client.config.other.guildID).iconURL({ dynamic: true }),
            guildName: client.guilds.cache.get(client.config.other.guildID).name,
            title: "Altın Kodlar",
            color: "ffcc00",
            codes: codes
        });
    });

    router.use(static(__dirname + "/../public"));

    router.get("/:id", async (req, res) => {
        let member = client.guilds.cache.get(client.config.other.guildID).members.cache.get(req.user.id);
        if (!req.user || !member) {
            return res.redirect(format({
                pathname: "/hata",
                query: {
                    statuscode: 401,
                    message: "Kodları görebilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir."
                }
            }));
        }

        let id = req.params.id
        if (!id) return res.redirect("/");
        let booster = member.roles.cache.has(client.config.roles.booster);
        let gold = member.roles.cache.has(client.config.roles.gold);
        let owner = member.roles.cache.has(client.config.roles.owner);
        if (!booster && !gold && !owner) {
            return res.redirect(format({
                pathname: "/hata",
                query: {
                    statuscode: 401,
                    message: "Altın Kodları görebilmek için Discord sunucumuzda 'Altın Kodlar' rolüne sahip olmalısınız."
                }
            }));
        }

        let code = await client.database.models.codes.findOne({
            codeID: id,
            codeCategory: "altin"
        });

        if (!code) {
            return res.redirect(format({
                pathname: "/hata",
                query: {
                    statuscode: 404,
                    message: `Altın Kodlar kategorisinde "${id}" ID'sine sahip bir kod bulunamadı.`
                }
            }));
        }
        let authors = code.codeAuthors || [];

        code = {
            codeID: code.codeID,
            codeAuthors: code.codeAuthors.length > 0 ? authors.map(async x => (await client.users.fetch(x)).tag) : ["Yok."],
            codeModules: code.codeModules,
            codeCategory: code.codeCategory,
            codeCommand: code.codeCommand == "-" ? false : code.codeCommand,
            codeDesc: code.codeDesc,
            codeMain: code.codeMain == "-" ? false : code.codeMain,
            codeName: code.codeName,
            sharerID: (await client.users.fetch(code.sharerID)).username,
            uploadDate: moment(code.uploadDate).format('LLLL')
        };

        res.render("kod", {
            user: req.user,
            brand: client.guilds.cache.get(client.config.other.guildID).iconURL({ dynamic: true }),
            guildName: client.guilds.cache.get(client.config.other.guildID).name,
            code: code,
            delete: code.sharerID === req.user.id ? true : false
        });
    });

    return router;
}