const express = require("express");
const handlebars = require("express-handlebars");
const url = require("url");
const { format } = require("url");
const { Client, WebhookClient, MessageEmbed } = require("discord.js");
const cookieParser = require("cookie-parser");
const { urlencoded, json } = require("body-parser");
const handlebarshelpers = require("handlebars-helpers")();
const path = require("path");
const passport = require("passport");
const { Strategy } = require("passport-discord");
const session = require("express-session");
const Mongoose = require("mongoose");

const app = express();
const client = new Client();

client.config = require("./settings/config.json");
client.hook = new WebhookClient(client.config.webhook.id, client.config.webhook.token)

Mongoose.connect(client.config.databaseURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

client.database = Mongoose.connection;

client.database.on("error", (err) => {
    throw new Error(err);
});

app.use(json());
app.use(urlencoded({
    limit: "50mb",
    extended: false
}));
app.use(cookieParser());
app.engine("handlebars", handlebars({
    defaultLayout: "main",
    layoutsDir: `${__dirname}/views/layouts/`,
    helpers: handlebarshelpers
}));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "handlebars");
app.use(express.static(__dirname + "/public"));
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((obj, done) => {
    done(null, obj);
});
passport.use(new Strategy({
    clientID: client.config.bot.id,
    clientSecret: client.config.bot.secret,
    callbackURL: client.config.bot.callbackURI,
    scope: client.config.bot.scopes
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));
app.use(session({
    secret: "secret-session-thing",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

client.database.once("open", async () => {
    require("./settings/models.js")(Mongoose, client.database);

    app.get("/giris", passport.authenticate("discord", {
        scope: client.config.bot.scopes
    }));

    app.get("/callback", passport.authenticate("discord", {
        failureRedirect: "/hata"
    }), async (req, res) => {
		if(!req) return res.redirect("/");
        res.redirect("/");
        const user = await client.users.fetch(req.user.id);
        client.channels.cache.get(client.config.other.loginLog).send(
            new MessageEmbed()
                .setDescription(`\`${user.tag}\` **(${user.id})** kullanıcısı siteye giriş yaptı!`)
                .setTimestamp()
                .setColor('RANDOM')
        )
    });

    app.get("/cikis", (req, res) => {
        req.logOut();
        return res.redirect("/");
    });

    app.get("/discord", (req, res) => {
        res.redirect(client.config.other.guildInvite);
    });

    app.get("/", (req, res) => {
        res.render("index", {
            user: req.user,
            guildName: client.guilds.cache.get(client.config.other.guildID).name,
            brand: client.guilds.cache.get(client.config.other.guildID).iconURL({ dynamic: true }),
            twitter: client.config.social.twitter,
            github: client.config.social.github,
            instagram: client.config.social.instagram
        });
    });

    app.get('/ozeluyeler', (req, res) => {
        res.render('specialmembers', {
            user: req.user,
            guildName: client.guilds.cache.get(client.config.other.guildID).name,
            brand: client.guilds.cache.get(client.config.other.guildID).iconURL({ dynamic: true }),
            staffs: client.guilds.cache.get(client.config.other.guildID).members.cache
                .filter(x => x.roles.cache.has(client.config.roles.staff))
                .map(x => {
                    return {
                        avatarURL: x.user.displayAvatarURL({ dynamic: true }),
                        username: x.user.username,
                        id: x.user.id,
                        status: x.presence.status,
                        highestRole: x.roles.highest.name
                    }
                }),
            s: client.guilds.cache.get(client.config.other.guildID).members.cache
                .filter(x => !x.roles.cache.has(client.config.roles.staff) && x.roles.cache.some(r => [client.config.roles.booster, client.config.roles.sponsor].includes(r.id))).map(x => {
                return {
                    avatarURL: x.user.displayAvatarURL({ dynamic: true }),
                    username: x.user.username,
                    id: x.user.id,
                    status: x.presence.status,
                    desc: x.roles.cache.has(client.config.roles.sponsor) ? "Sponsor" : "Booster",
                    background: x.roles.cache.has(client.config.roles.sponsor) ? "rgba(255, 145, 77, 0.5) 20%, rgb(255, 170, 51)" : "rgba(218, 127, 255, 0.5) 20%, rgb(242, 101, 255)"
                }
            })
        })
    });
    app.get("/users/:id", async (req, res) => {
        const userr = (await client.users.fetch(req.params.id));
        res.render('users', {
            user: req.user,
            brand: client.guilds.cache.get(client.config.other.guildID).iconURL({ dynamic: true }),
            guildName: client.guilds.cache.get(client.config.other.guildID).name,
            profile: {
                name: userr.username,
                avatar: userr.displayAvatarURL({ dynamic: true }),
                discriminator: userr.discriminator,
                id: userr.id
            }
        });
    });
    app.get("/bilgilendirme", (req, res) => {
        res.render("information", {
            user: req.user,
            brand: client.guilds.cache.get(client.config.other.guildID).iconURL({ dynamic: true }),
            guildName: client.guilds.cache.get(client.config.other.guildID).name,
        });
    });

    app.use("/normal", require("./router/normal")(client));

    app.use("/sizdengelenler", require("./router/topluluk")(client));

    app.use("/altin", require("./router/altin")(client));

    app.use("/elmas", require("./router/elmas")(client));

    app.use("/hazirsistemler", require("./router/hazır-sistemler")(client));

    app.use("/kod", require("./router/kod")(client));

    app.get("/hata", (req, res) => {
        res.render("hata", {
            user: req.user,
            brand: client.guilds.cache.get(client.config.other.guildID).iconURL({ dynamic: true }),
            guildName: client.guilds.cache.get(client.config.other.guildID).name,
            statuscode: req.query.statuscode,
            message: req.query.message
        });
    });

    app.use((req, res) => {
        return res.redirect(url.format({
            pathname: "/hata",
            query: {
                statuscode: 404,
                message: "Sayfa Bulunamadı"
            }
        }));
    });

    client.login(client.config.bot.token).then(() => {
        let listener = app.listen(client.config.other.sitePort, async () => {
            console.clear();
            console.info(`Site ${listener.address().port} portunda aktif`);
        });
    }).catch((err) => {
        throw new Error(err);
    });
});