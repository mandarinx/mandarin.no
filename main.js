var express         = require('express'),
    favicon         = require('serve-favicon'),
    busBoy          = require('express-busboy'),
    robots          = require('express-robots'),
    http            = require('http'),
    path            = require('path'),
    helmet          = require('helmet'),
    compress        = require('compression'),
    sslRedirect     = require('heroku-ssl-redirect')
    ;

var staticOptions = {
    dotfiles: 'ignore',
    etag: true,
    index: false,
    // maxAge: '1d',
    redirect: false
};

var app = express()
    .set('port', process.env.PORT)

    // Security
    .use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [
                "'self'",
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'"
            ],
            scriptSrc: [
                "'self'",
                'www.google-analytics.com',
                'www.googletagmanager.com',
                's3.amazonaws.com',
            ],
            fontSrc: [
                "'self'",
                'data:'
            ],
            imgSrc: [
                "'self'",
                'www.google-analytics.com',
            ],
            objectSrc: [
                "'none'",
            ]
        },
        browserSniff: true,
        loose: true,
    }))
    .use(helmet.dnsPrefetchControl())
    .use(helmet.frameguard({ action: 'deny' }))
    .disable('x-powered-by')
    .use(helmet.hsts({
        // 12 months 60 * 60 * 24 * 365
        maxAge: 31536000
    }))
    .use(helmet.ieNoOpen())
    .use(helmet.noSniff())
    .use(helmet.xssFilter())

    .use(robots({ UserAgent: '*' }))

    .use(favicon(__dirname + '/favicon.ico'))

    .use(compress({
        filter: function (req, res) {
            return /json|text|javascript|css|svg/.test(res.getHeader('Content-Type'));
        },
        level: 9
    }))

    .use('/', express.static(__dirname, staticOptions))
    .use(sslRedirect())
    ;

app.get('/.well-known/acme-challenge/:acmeToken', function(req, res, next) {
    var acmeToken = req.params.acmeToken;
    var acmeKey;

    if (process.env.ACME_KEY && process.env.ACME_TOKEN) {
        if (acmeToken === process.env.ACME_TOKEN) {
            acmeKey = process.env.ACME_KEY;
        }
    }

    for (var key in process.env) {
        if (key.startsWith('ACME_TOKEN_')) {
            var num = key.split('ACME_TOKEN_')[1];
            if (acmeToken === process.env['ACME_TOKEN_' + num]) {
                acmeKey = process.env['ACME_KEY_' + num];
            }
        }
    }

    if (acmeKey) {
        res.send(acmeKey);
    } else {
        res.status(404).send();
    }
});

busBoy.extend(app);

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

var server = app.listen(process.env.PORT, function() {
    console.log('Server listening on port '+process.env.PORT);
});

process.on('SIGTERM', function() {
    server.close(function() {
        console.log('Shutdown server');
        process.exit();
    });
});
