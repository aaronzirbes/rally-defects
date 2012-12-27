/**
 * © Adan Perez 2012
 */
var http = require('http');
var https = require('https');
var express = require("express");
var app = express();
var qs = require('querystring');
var request = require('request');
var async = require('async');
var ejslocals = require('ejs-locals');

app.configure(function () {
    // use ejs-locals for all ejs templates:
    app.engine('ejs', ejslocals);
    app.set('port', 3000);
    app.use(express.cookieParser());
    app.use(express.session({ secret: "session" }));
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(function (req, res, next) {
        res.locals.session = req.session
        next()
    });
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.set('view options', { open: '<%', close: '%>' });
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});


var userName = process.argv[2];
var password = process.argv[3];
var rallyServerHost = 'rally1.rallydev.com';
var rallyServerPath = '/slm/webservice/1.34';
var auth = userName + ':' + password;
var redDefect = 'Red : Critical';
var yellowDefect = 'Yellow : Essential';
var greenDefect = 'Green : Non-Essential';

function getDefectInfo(release, defectType, defectQuery, callback) {
    var query = defectQuery(release, defectType);
    getTotalFromRally('defect.js', query, callback);
}

function getTeamDefectInfo(release, team, defectType, defectQuery, callback) {
    var query = defectQuery(release, team, defectType);
    getTotalFromRally('defect.js', query, callback);
}

function getStoryInfo(release, storyQuery, callback) {
    var query = storyQuery(release);
    getTotalFromRally('HierarchicalRequirement.js', query, callback);
}

function getTotalFromRally(path, query, callback) {
    var options = {
        host: rallyServerHost,
        path: rallyServerPath + '/' + path + '?' + qs.stringify(query),
        auth: auth
    };
    getJSON(options, function (json) {
            var total = json.QueryResult.TotalResultCount;
            callback(null, total);
        }, function (e) {
            callback(e, null);
    });
}

var defectsOpenQuery = function (release, defectType) {
    var query = '(((Release.Name = "$RELEASE") and (Priority = "$DEFECT_TYPE")) and ((State = "New") or (State = "Open")))';
    query = query.replace('$RELEASE', release).replace('$DEFECT_TYPE', defectType);
    return {
        query: query,
        order: 'Rank',
        fetch: false,
        pagesize: 1
    }
}

var teamDefectsOpenQuery = function (release, team, defectType) {
    var query = '((((Release.Name = "$RELEASE") and (Priority = "$DEFECT_TYPE")) and (Team = "$TEAM")) and ((((State = "New") or (State = "Open")) or (State = "Rejected")) or (State = "Blocked")))';
    query = query.replace('$RELEASE', release).replace('$DEFECT_TYPE', defectType).replace('$TEAM', team);
    return {
        query: query,
        order: 'Rank',
        fetch: false,
        pagesize: 1
    }
}

var defectsTotalQuery = function (release, defectType) {
    var query = '((Release.Name = "$RELEASE") and (Priority = "$DEFECT_TYPE"))';
    query = query.replace('$RELEASE', release).replace('$DEFECT_TYPE', defectType);
    return {
        query: query,
        order: 'Rank',
        fetch: false,
        pagesize: 1
    }
}

var storyTotalQuery = function (release) {
    var query = '(Release.Name = "$RELEASE")';
    query = query.replace('$RELEASE', release);
    return {
        query: query,
        order: 'Rank',
        fetch: false,
        pagesize: 1
    }
}

var storyCompleteQuery = function (release) {
    var query = '((Release.Name = "$RELEASE") and ((ScheduleState = "Completed") or (ScheduleState = "Accepted")))';
    query = query.replace('$RELEASE', release);
    return {
        query: query,
        order: 'Rank',
        fetch: false,
        pagesize: 1
    }
}

var releaseOptions = {
    host: rallyServerHost,
    path: rallyServerPath + '/release.js?' + qs.stringify({
        order: 'Name',
        fetch: false,
        pagesize: 100
    }),
    auth: auth
};

var teamOptions = {
    host: rallyServerHost,
    path: rallyServerPath + '/HierarchicalRequirement/team/allowedValues.js?' + qs.stringify({
        order: 'Name',
        fetch: false,
        pagesize: 100
    }),
    auth: auth
};


function getJSON(options, success, error) {
    https.get(options,function (response) {
        var res = '';
        response.on('data', function (chunk) {
            res += chunk;
        });
        response.on('end', function (chunk) {
            try {
                res = JSON.parse(res);
            } catch (e) {
                console.log("getJSON parse JSON: " + e);
                error(e);
                return;
            }
            success(res);
        });
    }).on('error', function (e) {
            console.log("getJSON Error: " + e.message);
            error(e);
        });
}


app.get('/', function (req, res) {
    var release = req.query.release;
    getJSON(releaseOptions, function (json) {
        var results = [], releases = json.QueryResult.Results;
        for (var i = 0; i < releases.length; i++) {
            results[i] = releases[i]['_refObjectName'];
        }
        res.render('index.ejs', {
            locals: {
                releases: results,
                selectedRelease: release
            }
        });
    }, function (e) {
        console.log(e);
        res.render('index.ejs', {
            locals: {
                releases: [],
                selectedRelease: release
            }
        });
    });
});

app.get('/team', function (req, res) {
    var release = req.query.release;
    getJSON(teamOptions, function (json) {
        var teams = [], releases = json;
        var i = 0;
        for (var prop in json) {
            if (prop != 'null') {
                teams[i] = {
                    key: json[prop].replace(/( |-)/g, ''),
                    val: json[prop]
                };
                i++;
            }
        }
        getJSON(releaseOptions, function (json) {
            var results = [], releases = json.QueryResult.Results;
            for (var i = 0; i < releases.length; i++) {
                results[i] = releases[i]['_refObjectName'];
            }
            res.render('team.ejs', {
                locals: {
                    teams: teams,
                    releases: results,
                    selectedRelease: release
                }
            });
        }, function (e) {
            console.log(e);
        });
    }, function (e) {
        console.log(e);
    });
});


app.get('/teamInfo', function (req, res) {
    var teams = req.query.teams;
    var release = req.query.release;

    var defectJSON = {
        total: function (callback) {
            getDefectInfo(release, redDefect, defectsTotalQuery, function (err, result) {
                callback(err, result);
            });
        },
        storyTotal: function (callback) {
            getStoryInfo(release, storyTotalQuery, function (err, result) {
                callback(err, result);
            });
        },
        storyComplete: function (callback) {
            getStoryInfo(release, storyCompleteQuery, function (err, result) {
                callback(err, result);
            });
        }
    };

    for (var i = 0; i < teams.length; i++) {
        (function () {
            var team = teams[i];
            defectJSON[team.key] = function (callback) {
                getTeamDefectInfo(release, team.val, redDefect, teamDefectsOpenQuery, function (err, result) {
                    callback(err, result);
                });
            }
        })();
    }

    async.parallel(defectJSON, function (err, results) {
        if (err) {
            res.contentType('json');
            res.send({error: err.message});
        } else {
            res.contentType('json');
            res.send(results);
        }
    });
});


app.get('/info', function (req, res) {
    var release = req.query.release;
    async.parallel({
            greenTotal: function (callback) {
                setTimeout(function () {
                    getDefectInfo(release, greenDefect, defectsTotalQuery, function (err, result) {
                        callback(err, result);
                    });
                }, 5000);
            },
            greenOpen: function (callback) {
                setTimeout(function () {
                    getDefectInfo(release, greenDefect, defectsOpenQuery, function (err, result) {
                        callback(err, result);
                    });
                }, 5000);
            },
            yellowTotal: function (callback) {
                setTimeout(function () {
                    getDefectInfo(release, yellowDefect, defectsTotalQuery, function (err, result) {
                        callback(err, result);
                    });
                }, 5000);
            },
            yellowOpen: function (callback) {
                setTimeout(function () {
                    getDefectInfo(release, yellowDefect, defectsOpenQuery, function (err, result) {
                        callback(err, result);
                    });
                }, 5000);
            },
            redTotal: function (callback) {
                setTimeout(function () {
                    getDefectInfo(release, redDefect, defectsTotalQuery, function (err, result) {
                        callback(err, result);
                    });
                }, 5000);
            },
            redOpen: function (callback) {
                setTimeout(function () {
                    getDefectInfo(release, redDefect, defectsOpenQuery, function (err, result) {
                        callback(err, result);
                    });
                }, 5000);
            },
            storyTotal: function (callback) {
                setTimeout(function () {
                    getStoryInfo(release, storyTotalQuery, function (err, result) {
                        callback(err, result);
                    });
                }, 5000);
            },
            storyComplete: function (callback) {
                setTimeout(function () {
                    getStoryInfo(release, storyCompleteQuery, function (err, result) {
                        callback(err, result);
                    });
                }, 5000);
            }
        },
        function (err, results) {
            if (err) {
                res.contentType('json');
                res.send({error: err});
            } else {
                res.contentType('json');
                res.send(results);
            }
        });
});

http.createServer(app).listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});