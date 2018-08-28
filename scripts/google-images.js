 // Description:		
 //   A way to interact with the Google Images API.
 //
 // Configuration
 //   HUBOT_GOOGLE_CSE_KEY - Your Google developer API key
 //   HUBOT_GOOGLE_CSE_ID - The ID of your Custom Search Engine
 //   HUBOT_MUSTACHIFY_URL - Optional. Allow you to use your own mustachify instance.
 //   HUBOT_GOOGLE_IMAGES_HEAR - Optional. If set, bot will respond to any line that begins with "image me" or "animate me" without needing to address the bot directly
 //   HUBOT_GOOGLE_SAFE_SEARCH - Optional. Search safety level.
 //   HUBOT_GOOGLE_IMAGES_FALLBACK - The URL to use when API fails. `{q}` will be replaced with the query string.
 //
 // Commands:
 //   hubot image me <query> - The Original. Queries Google Images for <query> and returns a random top result.
 //   hubot animate me <query> - The same thing as `image me`, except adds a few parameters to try to return an animated GIF instead.
 //   hubot mustache me <url|query> - Adds a mustache to the specified URL or query result.
var deprecatedImage, ensureImageExtension, ensureResult, imageMe;

module.exports = function(robot) {
  robot.respond(/(image|img)( me)? (.+)/i, function(msg) {
    return imageMe(msg, msg.match[3], function(url) {
      return msg.send(url);
    });
  });
  robot.respond(/animate( me)? (.+)/i, function(msg) {
    return imageMe(msg, msg.match[2], true, function(url) {
      return msg.send(url);
    });
  });
  if (process.env.HUBOT_GOOGLE_IMAGES_HEAR != null) {
    robot.hear(/^(image|img) me (.+)/i, function(msg) {
      return imageMe(msg, msg.match[2], function(url) {
        return msg.send(url);
      });
    });
    robot.hear(/^animate me (.+)/i, function(msg) {
      return imageMe(msg, msg.match[1], true, function(url) {
        return msg.send(url);
      });
    });
  }
  return robot.respond(/(?:mo?u)?sta(?:s|c)h(?:e|ify)?(?: me)? (.+)/i, function(msg) {
    var encodedUrl, imagery, mustacheBaseUrl, mustachify, ref;
    if (process.env.HUBOT_MUSTACHIFY_URL == null) {
      msg.send("Sorry, the Mustachify server is not configured.", "http://i.imgur.com/BXbGJ1N.png");
      return;
    }
    mustacheBaseUrl = (ref = process.env.HUBOT_MUSTACHIFY_URL) != null ? ref.replace(/\/$/, '') : void 0;
    mustachify = mustacheBaseUrl + "/rand?src=";
    imagery = msg.match[1];
    if (imagery.match(/^https?:\/\//i)) {
      encodedUrl = encodeURIComponent(imagery);
      return msg.send("" + mustachify + encodedUrl);
    } else {
      return imageMe(msg, imagery, false, true, function(url) {
        encodedUrl = encodeURIComponent(url);
        return msg.send("" + mustachify + encodedUrl);
      });
    }
  });
};

imageMe = function(msg, query, animated, faces, cb) {
  var googleApiKey, googleCseId, q, url;
  if (typeof animated === 'function') {
    cb = animated;
  }
  if (typeof faces === 'function') {
    cb = faces;
  }
  googleCseId = process.env.HUBOT_GOOGLE_CSE_ID;
  if (googleCseId) {
    googleApiKey = process.env.HUBOT_GOOGLE_CSE_KEY;
    if (!googleApiKey) {
      msg.robot.logger.error("Missing environment variable HUBOT_GOOGLE_CSE_KEY");
      msg.send("Missing server environment variable HUBOT_GOOGLE_CSE_KEY.");
      return;
    }
    q = {
      q: query,
      searchType: 'image',
      safe: process.env.HUBOT_GOOGLE_SAFE_SEARCH || 'high',
      fields: 'items(link)',
      cx: googleCseId,
      key: googleApiKey
    };
    if (animated === true) {
      q.fileType = 'gif';
      q.hq = 'animated';
      q.tbs = 'itp:animated';
    }
    if (faces === true) {
      q.imgType = 'face';
    }
    url = 'https://www.googleapis.com/customsearch/v1';
    return msg.http(url).query(q).get()(function(err, res, body) {
      var error, i, image, len, ref, ref1, response, results;
      if (err) {
        if (res.statusCode === 403) {
          msg.send("Daily image quota exceeded, using alternate source.");
          deprecatedImage(msg, query, animated, faces, cb);
        } else {
          msg.send("Encountered an error :( " + err);
        }
        return;
      }
      if (res.statusCode !== 200) {
        msg.send("Bad HTTP response :( " + res.statusCode);
        return;
      }
      response = JSON.parse(body);
      if (response != null ? response.items : void 0) {
        image = msg.random(response.items);
        return cb(ensureResult(image.link, animated));
      } else {
        msg.send("Oops. I had trouble searching '" + query + "'. Try later.");
        if ((ref = response.error) != null ? ref.errors : void 0) {
          ref1 = response.error.errors;
          results = [];
          for (i = 0, len = ref1.length; i < len; i++) {
            error = ref1[i];
            results.push((function(error) {
              msg.robot.logger.error(error.message);
              if (error.extendedHelp) {
                return msg.robot.logger.error("(see " + error.extendedHelp + ")");
              }
            })(error));
          }
          return results;
        }
      }
    });
  } else {
    msg.send("Google Image Search API is not longer available. " + "Please [setup up Custom Search Engine API](https://github.com/hubot-scripts/hubot-google-images#cse-setup-details).");
    return deprecatedImage(msg, query, animated, faces, cb);
  }
};

deprecatedImage = function(msg, query, animated, faces, cb) {
  var imgUrl;
  imgUrl = process.env.HUBOT_GOOGLE_IMAGES_FALLBACK || 'http://i.imgur.com/CzFTOkI.png';
  imgUrl = imgUrl.replace(/\{q\}/, encodeURIComponent(query));
  return cb(ensureResult(imgUrl, animated));
};

ensureResult = function(url, animated) {
  if (animated === true) {
    return ensureImageExtension(url.replace(/(giphy\.com\/.*)\/.+_s.gif$/, '$1/giphy.gif'));
  } else {
    return ensureImageExtension(url);
  }
};

ensureImageExtension = function(url) {
  if (/(png|jpe?g|gif)$/i.test(url)) {
    return url;
  } else {
    return url + "#.png";
  }
};

// ---
// generated by coffee-script 1.9.2
