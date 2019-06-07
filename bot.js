var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
const rp = require('request-promise');
const cheerio = require('cheerio');

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
    if (channelID in bot.directMessages) {
        // Direct Message handling
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
                    to: channelID,
                    message: '**DiscBot Commands**\n'
                        + '```\n'
                        + '.disc <disc name>\n    Disc flight numbers\n\n'
                        + '.discupdate <disc name> <speed>/<glide>/<turn>/<fade>[/stability]\n    Boosters only; Update disc flight numbers\n\n'
                        + '.plastic <plastic name>\n    Plastic characteristics\n\n'
                        + '.pdga <pdga number (without #)>\n    Summary from PDGA.com\n\n'
                        + '.mypdga <pdga number (without #)>\n    Save your PDGA number\n'
                        + '```'
                });
                break;
                // !ping
                case 'ping':
                    bot.sendMessage({
                        to: channelID,
                        message: 'Pong!'
                    });
                break;
                case 'disc-doesnt-hit-trees':
                    bot.sendMessage({
                        to: channelID,
                        message: '<:DGGIT:585849585323343892> <:DGGUD:585849585176412182>'
                    });
                break;
                case 'pdga':
                    var fnMatch = args.match(/\<@[0-9]+\>/);
                    var pdga_id = 1;
                    var noMatch = false;

                    if (fnMatch) {
                        var db_user_id = fnMatch[0].match(/[0-9]+/);
                        var options = {
        					uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/pdga/' + db_user_id,
        					headers: {
        						'User-Agent': 'Request-Promise'
        					},
        					json: true // Automatically parses the JSON string in the response
        				};
        				rp(options)
        					.then(function (parsedBody) {
        						pdga_id = parseInt(parsedBody.pdga_id);
        					})
        					.catch(function (err) {
        						// API call failed...
        						noMatch = true;
        					});
                    }
                    else {
                        var pdga_id = args;
                    }
                    logger.info(pdga_id);
                    if (!noMatch) {
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
                      else {
                          bot.sendMessage({
                              to: channelID,
                              message: 'User hasn\'t shared their PDGA number with me!'
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
                // Just add any case commands if you want to..
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
