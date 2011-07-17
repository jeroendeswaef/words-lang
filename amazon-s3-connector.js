//  to be used with the js3db library

//document.getElementById('logoutAction').addEventListener('click', function() { JS3DB.Auth.DOM.logout(); return false; }, true);


S3Connector = {
	fileName: "words",
	
	init: function() {
		var logInElement = document.createElement('a');
		logInElement.setAttribute('href', '#');
		logInElement.setAttribute('id', 'logInAction');
		logInElement.setAttribute('class', 'rightMenu');
		logInElement.setAttribute('style', 'display: none');
		logInElement.appendChild(document.createTextNode('log in'));
		document.getElementById('header').insertBefore(logInElement, document.getElementById('saveToWebAction'));
		document.getElementById('logInAction').addEventListener('click', function() { JS3DB.Auth.DOM.onload('allContent', this.onLoggedIn); return false; }, true);
		var logOutElement = document.createElement('a');
		logOutElement.setAttribute('href', '#');
		logOutElement.setAttribute('id', 'logOutAction');
		logOutElement.setAttribute('class', 'rightMenu');
		logOutElement.setAttribute('style', 'display: none');
		logOutElement.appendChild(document.createTextNode('log out'));
		document.getElementById('header').insertBefore(logOutElement, document.getElementById('saveToWebAction'));
		document.getElementById('logOutAction').addEventListener('click', function() { JS3DB.Auth.DOM.logout(); return false; }, true);
	},
	
	save: function(jsonStr, doneFunc) {
		var that = this;
		console.log('S3Connector save');
		JS3DB.set(this.fileName, jsonStr,
            function(req, obj) {
                console.log('successfully saved file ' + that.fileName);
				if (doneFunc) doneFunc();
            },
            function(req, obj) {
                console.error('ERROR saving file ' + that.fileName
                    + '. Error message ' + obj.Error.Message);
        });
	},
	
	load: function(setterFunc) {
		JS3DB.Auth.read();
		console.log("S3, auth exists? ", JS3DB.Auth.exists());
		if (JS3DB.Auth.exists()) {
			document.getElementById('statusMessage').innerHTML = "init...";
			var that = this;
			var returnObj = null;
			console.log('S3Connector load');
			JS3DB.get(this.fileName, 
				function(obj) {
					console.log ('successfully retrieved file ' + that.fileName);
					setterFunc(obj);
				});
		}
		else {
			document.getElementById('logInAction').style.display = '';
		}
	}
}

S3Connector.init();
wordsLang.app.registerExternalStorage(S3Connector);