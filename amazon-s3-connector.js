//  to be used with the js3db library

document.addEventListener('load', function() { JS3DB.Auth.DOM.onload('allContent'); }, true);
document.getElementById('logoutAction').addEventListener('click', function() { JS3DB.Auth.DOM.logout(); return false; }, true);

S3Connector = {
	fileName: "words",
	
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
		var that = this;
		var returnObj = null;
		console.log('S3Connector load');
		JS3DB.get(this.fileName, 
        	function(obj) {
            	console.log ('successfully retrieved file ' + that.fileName);
				setterFunc(obj);
        });
	}
}

wordsLang.app.registerExternalStorage(S3Connector);