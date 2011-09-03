/*
 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
/*
 * 
 * Requires S3Ajax, json2.js
 * 
 */

JS3DB = {
	
	BUCKET : null,
    PREFIX : '',
    
    /*
     * Returns the current url
     * @return {String} The current url
     */
	getUrl_ : function() {
		return location.href;
	},
	
    /*
     * Retrieves the bucket name from a url.
     * @return {String} The name of the bucket.
     */
	getBucket_ : function() {
		var pattern = /^http:\/\/s3-eu-west-1\.amazonaws\.com\/(.*?)\//i;
		var url = this.getUrl_();
		var match = url.match(pattern);
		console.log("getBucket, url: " + url + "match? " + match);
		return match ? match[1] : null;
	},
    
    /*
     * Returns the filename to save this file as
     * Even though the user may enter one filename, we may want to prepend a 
     * prefext to distinguish files from different users.
     */
    getFilename : function(filename) {
        return this.PREFIX + filename;
    },
	
    /*
     * Attempt to save a json object.  The contents object is serialized to a 
     * string and then saved to the desired file.
     * @param {String} filename The name of the file to save the contents to
     * @param {Object} contents The object to save in the file
     * @param {Function} cb_opt Callback function to call on success
     * @param {Function} errcb_opt Callback function to call on error
     */
	set : function(filename, contents, params_opt, cb_opt, errcb_opt) {
		
		if (this.BUCKET == null) {
			this.BUCKET = this.getBucket_();
		}
        
        // Attempt to save the file
	    S3Ajax.put(this.BUCKET, this.getFilename(filename), 
            JSON.stringify(contents), params_opt,
            function(req, obj) {
                if (cb_opt) {
                    return cb_opt(req, obj);
                }
            },
            function(req, obj) {
                if (errcb_opt) {
                    return errcb_opt(req, obj);
                }
            });
	},
	
	/*
     * Attempt to save a binary object.  The contents object is serialized to a 
     * string and then saved to the desired file.
     * @param {String} filename The name of the file to save the contents to
     * @param {Object} contents The object to save in the file
     * @param {Function} cb_opt Callback function to call on success
     * @param {Function} errcb_opt Callback function to call on error
     */
	setRaw : function(filename, contents, params_opt, cb_opt, errcb_opt) {

		if (this.BUCKET == null) {
			this.BUCKET = this.getBucket_();
		}
		
		params_opt.isBinary = true;
		
        // Attempt to save the file
	    S3Ajax.put(this.BUCKET, this.getFilename(filename), 
            contents, params_opt,
            function(req, obj) {
                if (cb_opt) {
                    return cb_opt(req, obj);
                }
            },
            function(req, obj) {
                if (errcb_opt) {
                    return errcb_opt(req, obj);
                }
            });
	},
	
    /*
     * Attempts to get the specified file
     * @param {String} filename The filename to load
     * @param {Function} cb The callback function to call.
     */
	get : function(filename, cb) {
		
		if (this.BUCKET == null) {
			this.BUCKET = this.getBucket_();
		}
        
        // Attempt to get the file
        // We use cb as both the standard callback and the error callback, 
        // since an error may just indicate a non-existant bucket (in which 
        // case we return an empty object).  However, in the error callback
        // we also pass in the error object, just in case there's a need to
        // inspect it.
        S3Ajax.get(this.BUCKET, this.getFilename(filename), 
            function(req, responseText) {
                if (cb) {
                    return cb(JSON.parse(responseText));
                }
            },
            function(req, obj) {
                if (cb) {
                    return cb({}, obj);
                }
            });
	},
	
    /*
     * Default error callback (useful for debugging)
     */
	errorDefault : function(req, obj) {
        console.log('ERROR\n\tCode = ' + obj.Error.Code + '\n\tHostId = ' + obj.Error.HostId + '\n\tMessage = ' + obj.Error.Message + '\n\tRequestId = ' + obj.Error.RequestId);
	}
}


/*
 * @class JS3DB.Auth
 * Contains methods to hold AWS credentials
 */
JS3DB.Auth = {
    
    // AWS Credentials
    AWSID : '',
    AWSSECRETKEY : '',
    
    /*
     * Read the credentials from the cookie if they haven't been loaded already.
     */
    read : function() {
        if (this.exists())
            return;
        var authObj = JS3DB.Auth.Cookie.read();
        var awsid = '';
        var awssecretkey = '';
        if (authObj.awsid)
            awsid = authObj.awsid;
        if (authObj.awssecretkey)
            awssecretkey = authObj.awssecretkey;
        this.setValues(awsid, awssecretkey);
    },
    
    /*
     * Save the credentials to this object (and to the cookie if necessary)
     * @param {String} awsid The AWS id
     * @param {String} awssecretkey The AWS Secret Key
     * @param {Integer} persist Indicates how to persist the credentials:
     *     0 = Don't persist the credentials beyond this page
     *     1 = Persist the credentials in a cookie that expires when the user
     *         closes their browser
     *     2 = Persist the credentials in a cookie that expires after 2 weeks
     */
    write : function(awsid, awssecretkey, persist) {
        
        this.setValues(awsid, awssecretkey);
        
        if (persist > 0) {
            var remember = persist == 2 ? true : false;
            JS3DB.Auth.Cookie.write(awsid, awssecretkey, remember);
        }
    },
    
    setValues : function(awsid, awssecretkey) {
        this.AWSID = awsid;
        this.AWSSECRETKEY = awssecretkey;
        
        // set the key in the S3Ajax object
        if (S3Ajax) {
            S3Ajax.KEY_ID = this.AWSID;
            S3Ajax.SECRET_KEY = this.AWSSECRETKEY;
        }
        
        // use the user's AWSID as the file prefix
//        if (JS3DB) {
//            JS3DB.PREFIX = this.AWSID + '-';
//        }
    },
    
    /*
     * Checks if the credentials have been loaded
     * @return {Boolean} true if the credentials exist, false otherwise
     */
    exists : function() {
        return ((this.AWSID.length > 0) && 
                (this.AWSSECRETKEY.length > 0));
    },
    
    /*
     * Clears the credentials from memory and the cookie
     */
    clear : function() {
        this.AWSID = '';
        this.AWSSECRETKEY = '';
        JS3DB.Auth.Cookie.clear();
    }
}

/*
 * @class JS3DB.Auth.Cookie
 * Contains methods to read/write S3 credentials to the user's cookie
 */
JS3DB.Auth.Cookie = {
    
    // prefix all cookies generated by this package with this string in order 
    // to distinguish it from other cookies
    keyPrefix : 'js3db',
    
    // the keys to store the credentials with
    awsid_key : 'awsid',
    awssecretkey_key : 'awssecretkey',
    
    /*
     * Return the cookie string from the browser
     * @return {String} The string of the cookie
     */
    getCookie_ : function() {
        return document.cookie;
    },
    
    /*
     * Set the cookie in the user's browser
     */
    setCookie_ : function(cookieStr) {
        document.cookie = cookieStr;
    },
    
    /* 
     * Load the values from the js3db cookie.
     * @return {Object} Hash of the js3db cookie, or empty if it doesn't exist.
     */
    read : function() {
        
        // initialize the return object
        var cookieObj = {};
        
        // get the cookie from the browser
        var cookie = this.getCookie_();
        var ca = cookie.split(';');
        
        // for each item in the cookie, place all items with key that begins
        // with the approriate prefix into the hash
        for(var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(this.keyPrefix) == 0) {
                var key = c.substring(this.keyPrefix.length,
                                      c.indexOf('='));
                var val = c.substring(c.indexOf('=')+1);
                cookieObj[key] = val;
            }
        }
        return cookieObj;
    },
    
    /* 
     * Writes the auth cookie to the browser
     * @param {String} awsid The user's AWS ID
     * @param {String} awssecretkey The user's AWS Secret Key
     * @param {Boolean} persist_opt Keep this cookie around beyond the session.
     */
    write : function(awsid, awssecretkey, persist_opt) {
        
        function getExpires(days) {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            return ' expires=' + date.toGMTString() + ';';
        }
        
        function getCookieString(key, val) {
            return JS3DB.Auth.Cookie.keyPrefix + key + '=' + val + '; '
        }
        
        var expires = '';
        if (persist_opt) {
            expires = getExpires(14);
        }
        expires += 'path=/; ';
        
        var cookieStr = getCookieString(this.awsid_key, awsid);
        this.setCookie_(cookieStr + expires);
        cookieStr = getCookieString(this.awssecretkey_key, awssecretkey);
        this.setCookie_(cookieStr + expires);
    },
    
    /*
     * Clears the credential cookies
     */
    clear : function() {
        this.write('', '', false);
    }
}

/*
 * @class JS3DB.Auth.DOM
 * Contains the methods to interact with the user's browser DOM when signing
 * into JS3DB.  For example, if the user hasn't entered their credentials yet,
 * this class will display a login form to store that information.  To use, just
 * call JS3DB.Auth.DOM.onload when the body loads.
 */
JS3DB.Auth.DOM = {
    
    // the div to display after the user enters their credentials 
    sourcedivid : '',
    
    // the div that holds all the login elements
    logindivid : 'js3dbLogin',
    
    /*
     * Create a simple login form to collect the user's S3 credentials
     * @return {Element} The DOM element containing the login form.
     */
    createLoginDom : function() {
        
        // the surrounding div to hold all the elements
        var maindiv = document.createElement('div');
        maindiv.id = this.logindivid;
        
        // the form to surround the login page
        var form = document.createElement('form');
        form.onsubmit = JS3DB.Auth.DOM.onsubmit;
        
        // the div to hold the aws id form
        var awsiddiv = document.createElement('div');
        awsiddiv.appendChild(document.createTextNode('AWS ID: '));
        var awsid_input = document.createElement('input');
        awsid_input.type = 'text';
        awsid_input.id = 'textawsid';
        awsiddiv.appendChild(awsid_input);
        
        // the div to hold the aws secret key form
        var awssecretkeydiv = document.createElement('div');
        awssecretkeydiv.appendChild(
            document.createTextNode('AWS SECRET KEY: '));
        var awssecretkey_input = document.createElement('input');
        awssecretkey_input.type = 'password';
        awssecretkey_input.id = 'textawssecretkey';
        awssecretkeydiv.appendChild(awssecretkey_input);
        
        // option to save credentials to cookie
        var persistdiv = document.createElement('div');
        persistdiv.appendChild(
            document.createTextNode('Save credentials to cookie? '));
        var persistselect = document.createElement('select');
        persistselect.id = 'selectpersist';
        var option1 = document.createElement('option');
        option1.value = '0';
        option1.innerHTML = 'No';
        var option2 = document.createElement('option');
        option2.value = '1';
        option2.innerHTML = 'Yes - for the browser session';
        var option3 = document.createElement('option');
        option3.value = '2';
        option3.innerHTML = 'Yes - for 2 weeks';
        persistselect.appendChild(option1);
        persistselect.appendChild(option2);
        persistselect.appendChild(option3);
        persistdiv.appendChild(persistselect);
        persistdiv.appendChild(document.createElement('br'));
        persistdiv.appendChild(document.createTextNode(
            'Be aware that saving your AWS ID and Secret Key in a cookie is ' +
            'not secure.  Its offered here for testing purposes'));
        
        // the submit button
        var btnSubmit = document.createElement('input');
        btnSubmit.type = 'submit';
        btnSubmit.value = 'Submit';
        btnSubmit.id = 'btnSubmit';
        
        // chain them all up
        form.appendChild(awsiddiv);
        form.appendChild(awssecretkeydiv);
        form.appendChild(persistdiv);
        form.appendChild(btnSubmit);
        maindiv.appendChild(form);
        
        return maindiv;
    },
    
    /*
     * The function to call in the body's onload event.  This function checks to
     * see if the user's S3 credentials exist.  If they don't, the function will
     * hide the main div and instead show the login div so the user can enter 
     * their credentials. 
     * @param {Element} divid The div that contains the main application of this
     *     page.  This div will be hidden if the login form needs to be 
     *     displayed.
     */
    onload : function(divid, afterSuccessFunc) {
        
		this.afterSuccessFunc = afterSuccessFunc;
		
        // store the source div
        this.sourcedivid = divid;
        
        // check the user's credentials
        JS3DB.Auth.read();
        if (JS3DB.Auth.exists()) {
            document.getElementById(this.sourcedivid).style.display = '';            
            return;
        }
            
        // display the login form if the user has no credentials
        document.getElementsByTagName('body')[0]
                .appendChild(this.createLoginDom());
        document.getElementById(this.sourcedivid).style.display = 'none';
    },
    
    /*
     * Function thats called when the user submits the login form.
     */
    onsubmit : function() {
        
        // save the user's credentials
        var awsid = document.getElementById('textawsid').value;
        var awssecretkey = document.getElementById('textawssecretkey').value;
        var persist = document.getElementById('selectpersist').value;
        JS3DB.Auth.write(awsid, awssecretkey, persist);
        
        if (JS3DB.Auth.exists()) {
            // if the save was successful, hide the login form and show the
            // original div
            document.getElementById(JS3DB.Auth.DOM.sourcedivid)
                    .style.display = '';
            document.getElementById(JS3DB.Auth.DOM.logindivid)
                    .style.display = 'none';
			this.afterSuccessFunc();
        } else {
            alert('Please enter valid S3 credentials.');
        }

        return false;
    },
    
    /*
     * Delete the user's credentials
     */
    logout : function() {
        JS3DB.Auth.clear();
        location.reload(true);
    }
}
