var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
const rp = require('request-promise');
const cheerio = require('cheerio');

var ownerUserID = '138098206587355137';

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});

logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function (event) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
    bot.setPresence({
        game: {
            name: '.dischelp',
            type: 2
          }
    });
});

bot.on('message', function (user, userID, channelID, message, event) {
    if (channelID in bot.directMessages && message.substring(0,9) != '.dischelp') {
        // Direct Message handling
        logger.info(userID);
        logger.info(ownerUserID);

        if (userID == ownerUserID) {
            var args = message.substring(1).split(' ');
            var cmd = args[0];

            args = args.splice(1).toString();
            switch(cmd) {
                case 'botnick':
                    var botNick = message.replace('.botnick', '').trim();
                    logger.info('Bot nick name change to: ' + botNick)
                    bot.editNickname({
                        serverID: '367736108525682700',
                        userID: '585833915957379101',
                        nick: botNick,
                    });
                break;
            }
        }
    }
    else {
        // Our bot needs to know if it will execute a command
        // It will listen for messages that will start with `!`
        if (message.substring(0, 1) == '.') {
            var args = message.substring(1).split(' ');
            var cmd = args[0];

            args = args.splice(1).toString();
            switch(cmd) {
                case 'dischelp':
                    bot.sendMessage({
                        to: userID,
                        message: '**DiscBot Commands**\n'
                            + '```\n'
                            + '.disc <disc name>\n    Disc flight numbers\n\n'
                            + '.discupdate <disc name> <speed>/<glide>/<turn>/<fade>[/stability]\n    Boosters only; Update disc flight numbers\n\n'
                            + '.plastic <plastic name>\n    Plastic characteristics\n\n'
                            + '.pdga [pdga number (without #)]|[@user]\n    Summary from PDGA.com\n\n'
                            + '.mypdga <pdga number (without #)>\n    Save your PDGA number\n\n'
                            + '.ibag <disc name>[, <disc 2>, <disc 3>, etc.]\n    Tell DiscBot what frisbees you carry\n\n'
                            + '.whobags <disc name>\n    Find out who carries a certain disc\n\n'
                            + '.bag [@user]\n    See what @user is carrying, or just \'.bag\' to see your own\n'
                            + '.bagname <name>\n    Write what bag you are carrying or just give your bag a cool name.\n\n'
                            + '.bagphoto <photu URL>\n    A photo of your bag. Must be an image url (ends in .jpg, .png, etc)\n\n'
                            + '```'
                    });
                break;

                case 'disc-doesnt-hit-trees':
                    bot.sendMessage({
                        to: channelID,
                        message: '<:DGGIT:585849585323343892> <:DGGUD:585849585176412182>'
                    });
                break;

                case 'pdga':
                    var pdga_id = 1;
                    var db_user_id = 0;
                    var fnMatch = false;

                    if (args) {
                        fnMatch = args.match(/\<@!?[0-9]+\>/);
                    }
                    else {
                        db_user_id = userID;
                        fnMatch = true;
                    }

                    if (fnMatch) {
                        if (db_user_id == 0) {
                            db_user_id = fnMatch[0].match(/[0-9]+/);
                        }
                        var options = {
        					uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/pdga/' + db_user_id,
        					headers: {
        						'User-Agent': 'Request-Promise'
        					},
        					json: true // Automatically parses the JSON string in the response
        				};
        				rp(options)
        					.then(function (parsedBody) {

        						fetchPdga(parsedBody.pdga_id);
        					})
        					.catch(function (err) {
        						// API call failed...
                                bot.sendMessage({
                                    to: channelID,
                                    message: 'User hasn\'t shared their PDGA number with me!'
                                });
        					});
                    }
                    else {
                        fetchPdga(args);
                    }

                    function fetchPdga(pdga_id) {
                        var url = 'https://www.pdga.com/player/' + pdga_id;

                        rp(url)
                          .then(function(html){
                            //success!
                            var messageList = [];
                            // Name
                            messageList.push(cheerio('.pane-page-title > .pane-content', html).text());

                            // Details
                            cheerio('ul.player-info > li', html).each(function(index, element) {
                                messageList.push(cheerio(this).text());
                            });

                            bot.sendMessage({
                                to: channelID,
                                message: '```' + messageList.join('\n') + '```' + url
                            });
                          })
                          .catch(function(err){
                            //handle error
                            logger.info('An error occurred fetching information.');
                          });
                      }
                break;

                case 'disc':
                    logger.info(args);
    				var replyText = [];
    				var options = {
    					uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/disc/' + args.replace(",", "%20").trim(),
    					//qs: {
    					//	access_token: 'xxxxx xxxxx' // -> uri + '?access_token=xxxxx%20xxxxx'
    					//},
    					headers: {
    						'User-Agent': 'Request-Promise'
    					},
    					json: true // Automatically parses the JSON string in the response
    				};
    				rp(options)
    					.then(function (disc) {
    						var pdgaName = disc.pdga_name;
    						delete disc.id;
    						delete disc.pdga_name;
    						for(var p in disc) {
    							if (disc[p]) {
    								replyText.push(p.charAt(0).toUpperCase() + p.slice(1) + ': ' + disc[p])
    							}
    						}

    						bot.sendMessage({
    							to: channelID,
    							message: '```' + replyText.join('\n') + '```'
    						});
    					})
    					.catch(function (err) {
    						// API call failed...
    						bot.sendMessage({
    							to: channelID,
    							message: 'No disc found by that name.'
    						});
    					});
                break;

                case 'discupdate':
                    //logger.info(message.author.id);
                    if (bot.servers[event.d.guild_id].members[userID].roles.includes('585543893244837899')) {
                        var fnMatch = args.match(/(\-?\d{1,3}\d*\.?\d*\/){3,4}\-?\d{1,2}\d*\.?\d*/);

                        if (!fnMatch) {
                            bot.sendMessage({
                                to: channelID,
                                message: 'Invalid flight number format.',
                            });
                        }
                        else {
                            var flightNumbers = fnMatch[0];
                            var discName = args.toString().replace(',' + flightNumbers, '');

                            var options = {
                                method: 'GET',
                                uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/discupdate/' + discName.replace(",", "%20").trim() + '/' + flightNumbers,
                                headers: {
            						'User-Agent': 'Request-Promise'
            					},
                                json: true // Automatically stringifies the body to JSON
                            };

                            rp(options)
                                .then(function (parsedBody) {
                                    logger.info(parsedBody);
                                    // POST succeeded...
                                    bot.sendMessage({
                                        to: channelID,
                                        message: 'Disc "' + discName + '" Updated.',
                                    });
                                })
                                .catch(function (err) {
                                    logger.info(err);
                                    // POST failed...
                                    bot.sendMessage({
                                        to: channelID,
                                        message: 'Update failed, "' + discName + '" may not exist.',
                                    });
                            });
                        }
                    }
                    else {
                        bot.sendMessage({
                            to: channelID,
                            message: 'Boost the server in order to update DiscBot data.',
                        });
                    }
                break;

                case 'plastic':
                    logger.info(args);
    				var replyText = [];
    				var options = {
    					uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/plastic/' + args.replace(",", "%20").trim(),
    					//qs: {
    					//	access_token: 'xxxxx xxxxx' // -> uri + '?access_token=xxxxx%20xxxxx'
    					//},
    					headers: {
    						'User-Agent': 'Request-Promise'
    					},
    					json: true // Automatically parses the JSON string in the response
    				};
    				rp(options)
    					.then(function (plastic) {
    						for(var p in plastic) {
    							if (plastic[p]) {
    								replyText.push(p.charAt(0).toUpperCase() + p.slice(1) + ': ' + plastic[p])
    							}
    						}

    						bot.sendMessage({
    							to: channelID,
    							message: '```' + replyText.join('\n') + '```'
    						});
    					})
    					.catch(function (err) {
    						// API call failed...
    						bot.sendMessage({
    							to: channelID,
    							message: 'No plastic found by that name.'
    						});
    					}
    				);
                break;

                case 'mypdga':
                    var options = {
                        method: 'GET',
                        uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/mypdga/' + userID + '/' + args.replace(",", "%20").trim(),
                        headers: {
                            'User-Agent': 'Request-Promise'
                        },
                        json: true // Automatically stringifies the body to JSON
                    };

                    rp(options)
                        .then(function (parsedBody) {
                            logger.info(parsedBody);
                            // POST succeeded...
                            bot.sendMessage({
                                to: channelID,
                                message: 'Your PDGA number has been saved.',
                            });
                        })
                        .catch(function (err) {
                            logger.info(err);
                            // POST failed...
                            bot.sendMessage({
                                to: channelID,
                                message: 'Could not update your PDGA number. What did you do?',
                            });
                    });
                break;

                case 'ibag':
                    var replyText = [];
                    var addedDiscs = [];
                    var removedDiscs = [];
                    var failedDiscs = [];
                    var discNames = message.replace('.ibag ', '');

                    var options = {
                        method: 'GET',
                        uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/ibag/' + userID + '/' + discNames,
                        headers: {
                            'User-Agent': 'Request-Promise'
                        },
                        json: true // Automatically stringifies the body to JSON
                    };

                    rp(options)
                        .then(function (parsedBody) {
                            if (parsedBody.hasOwnProperty('added')) {
                                addedDiscs.push(parsedBody.added);
                            }
                            if (parsedBody.hasOwnProperty('removed')) {
                                removedDiscs.push(parsedBody.removed);
                            }
                            if (parsedBody.hasOwnProperty('failed')) {
                                failedDiscs.push(parsedBody.failed);
                            }

                            ibagReply(addedDiscs, removedDiscs, failedDiscs);
                        })
                        .catch(function (err) {
                            logger.info('An error occurred with ibag command.');
                    });

                    function ibagReply(addedDiscs, removedDiscs, failedDiscs) {
                        if (addedDiscs.length != 0) {
                           replyText.push('Added: ' + addedDiscs.join(', '));
                        }
                        if (removedDiscs.length != 0) {
                           replyText.push('Removed: ' + removedDiscs.join(', '));
                        }
                        if (failedDiscs[0]) {logger.info(failedDiscs);
                           replyText.push('Error (may not exist): ' + failedDiscs.join(', '));
                        }
                        logger.info(replyText.join('\n'));
                        bot.sendMessage({
                            to: channelID,
                            message: replyText.join('\n'),
                        });
                    }
                break;

                case 'whobags':
                    var throwers = [];
                    var discName = message.replace('.whobags ', '');
                    var options = {
                        method: 'GET',
                        uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/throwers/' + discName.trim(),
                        headers: {
                            'User-Agent': 'Request-Promise'
                        },
                        json: true // Automatically stringifies the body to JSON
                    };

                    rp(options)
                        .then(function (parsedBody) {
                            for (throwerID of parsedBody.users) {
                                throwers.push(bot.users[throwerID].username);
                            }

                            bot.sendMessage({
                                to: channelID,
                                message: discName.charAt(0).toUpperCase() + discName.slice(1) + ' gang:\n' + throwers.join(', '),
                            });
                        })
                        .catch(function (err) {
                            bot.sendMessage({
                                to: channelID,
                                message: 'No one here bags that disc!',
                            });
                    });
                 break;

                 case 'bag':
                    var pdga_id = 1;
                    var db_user_id = 0;
                    var fnMatch = false;
                    var embedFields = [];
                    var moldCount = 0;
                    var bagNick = '';
                    var bagPhoto = '';

                    if (args) {
                        fnMatch = args.match(/\<@!?[0-9]+\>/);
                    }
                    else {
                        db_user_id = userID;
                        fnMatch = true;
                    }

                    if (fnMatch) {
                        if (db_user_id == 0) {
                            db_user_id = fnMatch[0].match(/[0-9]+/);
                        }

                        var options = {
                            method: 'GET',
                            uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/bagsorted/' + db_user_id,
                            headers: {
                                'User-Agent': 'Request-Promise'
                            },
                            json: true // Automatically stringifies the body to JSON
                        };

                        rp(options)
                            .then(function (parsedBody) {
                                for (discCategory in parsedBody.discs) {
                                    //replyText.push('**' + discCategory + '**: ' + parsedBody.discs[discCategory].join(', '));
                                    moldCount += parsedBody.discs[discCategory].length;
                                    embedFields.push({name: discCategory, value: parsedBody.discs[discCategory].join(', ')});
                                }

                                // Bag Nickname
                                if (parsedBody.bag_nick) {
                                    bagNick = '"' + parsedBody.bag_nick + '" ';
                                }
                                // Bag photo
                                if (parsedBody.bag_photo) {
                                    bagPhoto = parsedBody.bag_photo;
                                }

                                bot.sendMessage({
                                    to: channelID,
                                    message: '',
                                    embed: {
                                        color: 3447003,
                                        author: {
                                            name: bot.users[db_user_id].username + '\'s ' + bagNick + 'bag',
                                            icon_url: bot.users[db_user_id].avatarURL
                                        },
                                        thumbnail: {
                                          url: bagPhoto
                                        },
                                        fields: embedFields,
                                        footer: {
                                            icon_url: bot.users[db_user_id].avatarURL,
                                            text: bot.users[db_user_id].username + ' carries ' + moldCount + ' different molds, mostly '
                                                + parsedBody.mfr_pref + ' discs.'
                                        }
                                    }
                                });
                            })
                            .catch(function (err) {
                                bot.sendMessage({
                                    to: channelID,
                                    message: 'Player bag not found.'
                                });
                        });
                    }
                break;

                case 'bagname':
                    var bagName = message.replace('.bagname ', '').substring(0,45).replace('?', '%3F');
                    var options = {
                        method: 'GET',
                        uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/bagnick/' + userID + '/' + bagName,
                        headers: {
                            'User-Agent': 'Request-Promise'
                        },
                        json: true // Automatically stringifies the body to JSON
                    };

                    rp(options)
                        .then(function (parsedBody) {
                            logger.info(parsedBody);
                            // POST succeeded...
                            bot.sendMessage({
                                to: channelID,
                                message: 'Bag nick name updated.',
                            });
                        })
                        .catch(function (err) {
                            logger.info(err);
                            // POST failed...
                            bot.sendMessage({
                                to: channelID,
                                message: 'Could not update your bag. What did you do?',
                            });
                    });
                break;

                case 'bagphoto':
                    var photoUrl = '';
                    var fnMatch = null;
                    if (args) {
                        fnMatch = message.match(/(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/);
                    }

                    if (fnMatch) {
                        photoUrl = fnMatch[0];

                        var options = {
                            method: 'GET',
                            uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/bagphoto/' + userID + '?photoUrl=' + encodeURIComponent(photoUrl),
                            headers: {
                                'User-Agent': 'Request-Promise'
                            },
                            json: true // Automatically stringifies the body to JSON
                        };

                        rp(options)
                            .then(function (parsedBody) {
                                // POST succeeded...
                                bot.sendMessage({
                                    to: channelID,
                                    message: 'Bag photo updated.',
                                });
                            })
                            .catch(function (err) {
                                logger.info(err);
                                // POST failed...
                                bot.sendMessage({
                                    to: channelID,
                                    message: 'Could not update your bag photo. What did you do?',
                                });
                            });
                    }
                    else {
                        bot.sendMessage({
                            to: channelID,
                            message: 'Invalid photo URL. Must end in .jpg, .png, etc...',
                        });
                    }
                break;

                case 'bagstats':
                    var embedFields = [];

                    var options = {
                        method: 'GET',
                        uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/bagstats',
                        headers: {
                            'User-Agent': 'Request-Promise'
                        },
                        json: true // Automatically stringifies the body to JSON
                    };

                    rp(options)
                        .then(function (parsedBody) {
                            // POST succeeded...

                            // Total bags
                            embedFields.push({name: 'Total number of bags: ', value: parsedBody.bag_count});

                            // top 10 molds
                            var top10Discs = [];
                            for (top10Mold of parsedBody.top) {
                                top10Discs.push(top10Mold.name + ' (' + top10Mold.count + ')')
                            }
                            embedFields.push({name: 'Top 10 Molds', value: top10Discs.join(', ')});
                            logger.info(parsedBody.most_molds[0].user_id);
                            // Most molds
                            //embedFields.push({name: 'Disc Collector', value: bot.users[parsedBody.most_molds.user_id].username + ' carries the most molds with ' + parsedBody.most_molds.count});

                            // Fewest molds
                            //embedFields.push({name: 'Philo Fanclub', value: bot.users[parsedBody.fewest_molds.user_id].username + ' carries the fewest molds with ' + parsedBody.fewest_molds.count});

                            bot.sendMessage({
                                to: channelID,
                                message: '',
                                embed: {
                                    color: 3447003,
                                    title: 'Discord Bag Stats',
                                    fields: embedFields
                                }
                            });
                        })
                        .catch(function (err) {
                            logger.info(err);
                            // POST failed...
                            bot.sendMessage({
                                to: channelID,
                                message: 'Bag stats could not be retrieved at this time.',
                            });
                        });
                break;
             }
         }
         else if (message.toLowerCase().includes('<@585833915957379101> sucks') || message.toLowerCase().includes('failed bot') || message.toLowerCase().includes('bad bot')) {
             bot.sendMessage({
                 to: channelID,
                 message: 'Here\'s an idea, <@' + userID + '>, how about you stop throwing nose-up.'
             });
         }
     }
});
