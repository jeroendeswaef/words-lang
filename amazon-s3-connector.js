//  to be used with the js3db library

document.addEventListener('load', function() { JS3DB.Auth.DOM.onload('allContent'); }, true);
document.getElementById('logoutAction').addEventListener('click', function() { JS3DB.Auth.DOM.logout(); return false; }, true);

S3Connector = {
	save: function(jsonStr) {
		console.log('S3Connector save');
		JS3DB.set("words", jsonStr,
            function(req, obj) {
                console.log('Successfully saved file ' + "words");
            },
            function(req, obj) {
                console.error('ERROR saving file ' + filename
                    + '. Error message ' + obj.Error.Message);
        });
	}
}

wordsLang.app.registerExternalStorage(S3Connector);