
var async   = require('async');
var fs      = require('fs');
var request = require('request');
var twitter = require('twitter');

var bot_id = '193s_bot01';

twitter.prototype.reply = function(text, to) { f_reply(this, text, to) }
function f_reply(twitter, text, to) {
  console.log(twitter);
  twitter.post (
    'statuses/update',
    { status: text, in_reply_to_status_id: to },
    function(data) {
      if (data == null) console.log('data: null');
      else if (data[0].code == 187) {
        console.log('re-send');
        f_reply(twitter, text + ' #', to);
      }
      else console.log('post; ok -- ' + text);
    }
  );
}

twitter.prototype.updateStatus = function(text) {
  this.post('statuses/update', {status: text}, function(data) {
    console.log('post; ok -- ' + text);
  });
}


var last_context = '0001';

function ask(docomo_apikey, tweet, callback) {
  var text = tweet.text.replace(new RegExp('^@' + bot_id + ' '), '');
  var data = {
    utt: text,
    nickname: tweet.user.name,
    sex: '女',
    age: '16',
    place: '東京',
    t: 20, // 関西弁
    context: last_context
  }
  request.post ({
    url: 'https://api.apigw.smt.docomo.ne.jp/dialogue/v1/dialogue?APIKEY='+docomo_apikey,
    json: data
  }, function(err, res, body) {
    if (err) throw err;
    callback(body.utt, data);
  });
}

async.series ([
  function(callback) {
    fs.readFile('./twitter_keys.json', function(err, text) {
      if (err) throw err;
      console.log('loading twitter_keys');
      var twitter_conf = JSON.parse(text);
      var bot = new twitter(twitter_conf);
      callback(null, bot);
    });
  },

  function(callback) {
    var docomo_apikey = '';
    console.log('loading docomo_keys');
    fs.readFile('./docomo_keys.json', function(err, text) {
      docomo_apikey = JSON.parse(text).api_key;
      callback(null, docomo_apikey);
    });
  }
], function(err, results) {
  if (err) throw err;
  var bot = results[0];
  var docomo_apikey = results[1];

  bot.stream('statuses/filter', {'track': '@' + bot_id}, function(stream) {
    stream.on('data', function(data) {
      console.log(data.text);
      // if (!('user' in data)) return;
      var id = data.user.screen_name;
      var ifMention = data.in_reply_to_user_id != null;

      if (!ifMention || id == bot_id) return;
      ask(docomo_apikey, data, function(res, d) {
        var msg = '@' + id + ' ' + res;
        console.log('res:', res);
        last_context = res.context;
        bot.reply(msg, data.id_str);
      });
    });
  });
});

