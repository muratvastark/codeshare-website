const { Router, static } = require("express");
const { format } = require("url");
const randomString = require("random-string");
const { MessageEmbed } = require("discord.js");
const router = Router();

router.use(static(__dirname + "/../public"));

module.exports = (client) => {

    router.post("/paylas", async (req, res) => {
        const guild = client.guilds.cache.get(client.config.other.guildID)
        const member = guild.members.cache.get(req.user.id);

        if (!req.user || !member) {
            return res.redirect(format({
                pathname: "/hata",
                query: {
                    statuscode: 401,
                    message: "Kod paylaşabilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir."
                }
            }));
        }

        if (req.body.authors.split(',').length > 0 && req.body.authors.split(',').every(x=>{
            const bitLength = Math.log2(x);
            return bitLength < 64 && 22 < bitLength;
        })) {
            return res.redirect(format({
                pathname: "/hata",
                query: {
                    statuscode: 406,
                    message: "Yapan kişiler sadece idden oluşmak zorundadır."
                }
            }));
        }
        
        let sharerBoolean, rank;
        if(member.roles.cache.has(client.config.roles.codesharer)) {
            rank = req.body.rank;
            sharerBoolean = true;
        } else {
            rank = 'sizdengelenler';
            sharerBoolean = false;
        }
    
        let code = new client.database.models.codes({
            codeAuthors: req.body.authors ? req.body.authors.split(',') : [],
            codeModules: req.body.modules ? req.body.modules.split(',') : [],
            codeID: randomString({ length: 10 }),
            codeCategory: rank,
            codeCommand: req.body.commandsFile,
            codeDesc: req.body.description,
            codeMain: req.body.mainFile,
            codeName: req.body.name,
            codeStatus: sharerBoolean,
            sharerID: req.user.id,
            uploadDate: Date.now(),
        });
    
        await code.save();

        client.hook.send(new MessageEmbed().setTitle("Yeni Kod Paylaşıldı").addField("Kod Adı: ", req.body.name).addField("Açıklama: ", req.body.description).addField("Rank: ", rank).addField("Kod Sayfası: ", `[Tıkla Git](${client.config.other.siteURL}/${rank}/${code.codeID})`));
        res.redirect(`/${rank}/${code.codeID}`);
    });

    router.get("/paylas", async (req, res) => {
        const guild = client.guilds.cache.get(client.config.other.guildID)

        if (!req.user || !guild.members.cache.get(req.user.id)) {
            return res.redirect(format({
                pathname: "/hata",
                query: {
                    statuscode: 401,
                    message: "Kod paylaşabilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir."
                }
            }));
        }

        res.render("paylas", {
            user: req.user,
            brand: client.guilds.cache.get(client.config.other.guildID).iconURL({ dynamic: true }),
            guildName: client.guilds.cache.get(client.config.other.guildID).name
        });
    });

    router.get("/sil/:rank/:id", async (req, res) => {
        const guild = client.guilds.cache.get(client.config.other.guildID)

        if (!req.user || !guild.members.cache.get(req.user.id)) {
            return res.redirect(format({
                pathname: "/hata",
                query: {
                    statuscode: 401,
                    message: "Kod silebilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir."
                }
            }));
        }

        let code = await client.database.models.codes.findOne({ codeID: req.params.id, codeCategory: req.params.rank });

        if (!code) return res.redirect(format({
            pathname: "/hata",
            query: {
                statuscode: 404,
                message: "Kod bulunamadı."
            }
        }));

        if(code.sharerID !== req.user.id && !guild.members.cache.get(req.user.id).roles.cache.has(client.config.roles.owner)) {
            return res.redirect(format({
                pathname: "/hata",
                query: {
                    statuscode: 505,
                    message: "Kodu silmek için kodu paylaşan veya kurucu olmak zorundasınız."
                }
            }));
        }

        client.hook.send(new MessageEmbed().setTitle("Bir Kod Silindi").addField("Kod Adı: ", code.codeName).addField("Açıklama: ", code.codeDesc).addField("Rank: ", code.codeCategory).addField("Silen Kişi:", `<@${req.user.id}>`));
        await client.database.models.codes.deleteOne({
            codeID: req.params.id,
            codeCategory: req.params.rank
        });

        res.redirect("/");

    });

    return router;
}