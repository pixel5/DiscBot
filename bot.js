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
                    var url = 'https://www.pdga.com/player/' + args;

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
                break;
                case 'disc':
                    logger.info(args);
    				var replyText = [];
    				var options = {
    					uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/disc/' + args.replace(",", "%20"),
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
    					}
    				);
                break;
                case 'discupdate':
                    //logger.info(message.author.id);
                    if (bot.servers[event.d.guild_id].members[userID].roles.includes('585543893244837899')) {
                        var fnMatch = args.match(/(\-?\d{1,3}\d*\.?\d*\/){3,4}\-?\d{1,2}\d*\.?\d*/);
                        var flightNumbers = fnMatch[0];
                        var discName = args.toString().replace(flightNumbers, '');

                        var options = {
                            method: 'GET',
                            uri: 'https://' + auth.pixel5_api + '@api.pixel5.us/discbot/discupdate/' + discName.replace(",", "%20") + flightNumbers,
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
                    else {
                        bot.sendMessage({
                            to: channelID,
                            message: 'You do not have permission to update discs.',
                        });
                    }
                break;
                // Just add any case commands if you want to..
             }
         }
         else if (message.includes('<@585833915957379101> sucks') || message.includes('failed bot') || message.includes('bad bot')) {
             bot.sendMessage({
                 to: channelID,
                 message: 'Here\'s an idea, <@' + userID + '>, how about you stop throwing nose-up.'
             });
         }
     }
});
