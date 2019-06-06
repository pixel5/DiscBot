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
            case 'disc':
				logger.info(args);
				var replyText = [];
				var options = {
					uri: 'https://api.pixel5.us/discbot/disc/' + args.replace(",", "%20"),
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
			
                // var urlDiscName = args.replace(/\s+/g, '-').toLowerCase();
                // var url = 'https://www.pdga.com/technical-standards/equipment-certification/discs/' + urlDiscName;

                // rp(url)
                  // .then(function(html){
                    // //success!
                    // var messageList = [];
                    // cheerio('.views-row > div', html).each(function(index, element) {
                        // messageList[index] = cheerio(this).text();
                    // });

                    // bot.sendMessage({
                        // to: channelID,
                        // message: messageList.join('\n')
                    // });
                  // })
                  // .catch(function(err){
                    // //handle error
                    // logger.info('An error occurred fetching information.');
                  // });
            break;
            // Just add any case commands if you want to..
         }
     }
});
