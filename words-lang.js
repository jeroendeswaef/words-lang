if (typeof console === 'undefined') {
	console = {
		log: function() {},
		error: function() {}
	}
}

Function.prototype.method = function (name, func) { 
    this.prototype[name] = func; 
    return this; 
}; 

Function.method('bindThis', function(that) {
	var method = this;
	return function() {
		return method.apply(that, arguments);
	};
});

wordsLang = {
	app: {
		entries: [],
		externalStorage: null,
		
		init: function() {
			if(wordsLang.utilities.supportsLocalStorage()) {
				this.localTimeStamp = 0;
				this.entryCntElement = document.getElementById('entryCnt');
				this.frontEditElement = document.getElementById('frontEdit');
				this.backEditElement = document.getElementById('backEdit');
				this.entryListElement = document.getElementById('entryList');
				this.createEntryElement = document.getElementById('editEntry');
				this.saveEntryActionElement = document.getElementById('saveEntryAction');
				this.askViewElement = document.getElementById('askView');
				this.views = ['askView', 'entryList', 'editEntry', 'nothingToDo'];
				this.activeView = 'askView';
				this.currentQuestionEntryId = null;
				this.proceedAnyway = false;
				this.proceedAnywayCounter = 0;
				
				document.getElementById('createNewAction').addEventListener('click', this.addEntry.bindThis(this), true);
				this.saveEntryActionElement.addEventListener('click', wordsLang.app.saveEntry.bindThis(this), true);
				document.getElementById('showEntryListAction').addEventListener('click', wordsLang.app.showEntryList, true);
				document.getElementById('practiseAction').addEventListener('click', wordsLang.app.showPractiseView, true);
				document.getElementById('showAnswerAction').addEventListener('click', this.showAnswer.bindThis(this), true);
				document.getElementById('saveToWebAction').addEventListener('click', this.saveToWeb.bindThis(this), true);
				document.getElementById('loadFromWebAction').addEventListener('click', this.loadFromWeb.bindThis(this), true);
				window.addEventListener('keypress', this.respondToKeypress.bindThis(this), true);
				document.getElementById('frontEdit').addEventListener('keypress', function() { setTimeout(function() { wordsLang.app.updateView() }, 0) }, true);
				document.getElementById('backEdit').addEventListener('keypress', function() { setTimeout(function() { wordsLang.app.updateView() }, 0) }, true);
				document.getElementById('proceedAnywayAction').addEventListener('click', this.setProceedAnyway.bindThis(this), true);
				document.getElementById('searchBox').addEventListener('keypress', function() { setTimeout(function() { wordsLang.app.updateView() }, 0) }, true);
				document.getElementById('uploadButton').addEventListener('click', this.uploadImage.bindThis(this), false);
				answerActionElements = document.getElementsByName('answeredAction')
				for(var i = 0; i < answerActionElements.length; i++) {
					answerActionElements[i].addEventListener('click', this.clickAnswer.bindThis(this), true);
				}
				
				this.fillFromLocalStorage();
				this.loadFromWeb();
				this.nextQuestion();
				this.updateView();
			}
			else {
				alert("browser doesn't have local storage");
			}
		},
		
		uploadImage: function() {
			var files = document.getElementById('files').files; // FileList object

		    // files is a FileList of File objects. List some properties.
		    var output = [];
		    for (var i = 0, f; f = files[i]; i++) {
		      output.push('<li><strong>', f.name, '</strong> (', f.type || 'n/a', ') - ',
		                  f.size, ' bytes, binary: ',
		                  f.getAsBinary(), '</li>');
					this.externalStorage.uploadImage(f.getAsBinary());
		    }
		    document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
			
		},
		
		fillFromLocalStorage: function() {
			console.log('fillFromLocalStorage, timeStamp: ' + localStorage.getItem("wordsLangTimeStamp"));
			wordsLang.app.entries = []
			if (localStorage.getItem("wordsLangTimeStamp") !== null) {
				wordsLang.app.localTimeStamp = parseInt(localStorage.getItem("wordsLangTimeStamp"));
			}
			// else this.localTimeStamp = 0
			
			for(var i = 0; i < localStorage.length; i++) {
				var str = localStorage.getItem(localStorage.key(i));
				if (localStorage.key(i).indexOf('wordsLangEntry') == 0) {
					var parts = str.split("|-|");
					var lastSeen = null
					if (parts[2] && parts[2] != "") {
						lastSeen = this.getLastSeen(parts[2]);
					}
					var entry = {	
						front: parts[0],
						back: parts[1],
						lastSeen: lastSeen,
						interval: parseInt(parts[3]),
						easeFactor: parseFloat(parts[4])
					}
					wordsLang.app.entries.push(entry);
				}
			}
		},
		
		getDateStr: function(date) {
			console.log('getDateStr', date, date && date.getDate());
			var str = "";
			if (date) {
				str = date.getFullYear() + "-" + (parseInt(date.getMonth()) + 1)
					+ "-" + (parseInt(date.getDate()));
			}
			return str;
		},
		
		getLastSeenStr: function(entry) {
			return this.getDateStr(entry.lastSeen);
		},
		
		getLastSeen: function(lastSeenStr) {
			if (lastSeenStr === null) return null;
			return new Date(	parseInt(lastSeenStr.split('-')[0]), 
									parseInt(lastSeenStr.split('-')[1]) - 1, 
									parseInt(lastSeenStr.split('-')[2]), 0, 0, 0);
		},
		
		saveToLocalStorage: function() {
			console.log('saveToLocalStorage, timeStamp: ' + wordsLang.app.localTimeStamp);
			localStorage.clear();
			localStorage.setItem("wordsLangTimeStamp", wordsLang.app.localTimeStamp);
			for(var i = 0; i < wordsLang.app.entries.length; i++) {
				var entry = wordsLang.app.entries[i];
				var lastSeenStr = this.getLastSeenStr(entry);
				var entryStr = entry.front + "|-|" + entry.back + "|-|" 
					+ lastSeenStr + "|-|" + entry.interval + "|-|" + entry.easeFactor
				localStorage.setItem("wordsLangEntry-" + i, entryStr);
			}
		},
		
		saveToWeb: function(event) {
			var cards = {
				version: 1,
				savedTimeStamp: wordsLang.app.localTimeStamp,
				entries: this.entries
			}
			var jsonStr = JSON.stringify(cards);
			console.log('saveToWeb, jsonStr:', jsonStr);
			if(this.externalStorage != null) {
				this.externalStorage.save(jsonStr, this.savedToWeb.bindThis(this));
			}
			event.preventDefault();
		},
		
		savedToWeb: function(event) {
			this.webTimeStamp = this.localTimeStamp;
			this.updateView();
		},
		
		loadFromWeb: function(event) {
			console.log('load from web');
			if(this.externalStorage != null) {
				this.externalStorage.load(this.loadedFromWeb.bindThis(this));
			}
			if (event) event.preventDefault();
		},
		
		loadedFromWeb: function(jsonStr) {
			var obj = JSON.parse(jsonStr);
			console.log('loadedFromWeb, localtimestamp: ' + this.localTimeStamp + ', servertime: ' + obj.savedTimeStamp);
			if (this.localTimeStamp < obj.savedTimeStamp) {
				this.fillFromWeb(obj.entries);
				this.localTimeStamp = obj.savedTimeStamp;
				this.saveToLocalStorage();
			} 
			this.webTimeStamp = obj.savedTimeStamp;
			this.updateView();
		},
		
		fillFromWeb: function(rawObj) {
			var obj = [];
			for(var i = 0; i < rawObj.length; i++) {
				var entry = {	
					front: rawObj[i].front,
					back: rawObj[i].back,
					lastSeen: wordsLang.app.getLastSeen(rawObj[i].lastSeen),
					interval: rawObj[i].interval,
					easeFactor: rawObj[i].easeFactor
				}
				obj.push(entry);
			}
			this.entries = obj;
		},
		
		// storage must be an object with the following methods:
		// save (json)
		// load
		registerExternalStorage: function(storage) {
			this.externalStorage = storage;
		},
		
		clickAnswer: function(event) {
			var quality = parseInt(event.currentTarget.getAttribute('value'));
			this.answer(quality);
		},
		
		answer: function(quality) {
			var entry = this.getCurrentEntry();
			var now = new Date();
			entry.lastSeen = now;
			entry.interval++;
			entry.easeFactor = parseFloat(entry.easeFactor) + (0.1-(5-quality)*(0.08+(5-quality)*0.02));
			entry.easeFactor *= 10;
			entry.easeFactor = Math.round(entry.easeFactor);
			entry.easeFactor /= 10;
			if (entry.easeFactor < 1.3) entry.easeFactor = 1.3; 
			console.log("answer, quality: " + quality + ", new interval: " + entry.interval, ", EF: " + entry.easeFactor);
			this.modifyEntries( function() {
				this.entries[this.currentQuestionEntryId] = entry;
			}.bindThis(this));
			this.nextQuestion();
			this.updateView();
		},
		
		addEntry: function(e) {
			this.cleanCreateView();
			this.activeView = 'editEntry';
			this.updateView();
			e.preventDefault();
		},
		
		saveEntry: function(e) {
			console.log('saveEntry');
			var entryId = parseInt(e.target.getAttribute('entryId'));
			var index = (entryId !== -1 ? entryId : wordsLang.app.entries.length);
			var entry = {
				front: wordsLang.app.frontEditElement.value,
				back: wordsLang.app.backEditElement.value,
				lastSeen: null,
				interval: 0,
				easeFactor: 2.5
			};
			this.modifyEntries( function() {
				this.entries[index] = entry;
			}.bindThis(this));
			if (entryId !== -1) {
				this.activeView = 'entryList';
			}
			this.cleanCreateView();
			this.updateView();
			e.preventDefault();
		},
		
		getCurrentEntry: function() {
			return wordsLang.app.entries[wordsLang.app.currentQuestionEntryId]
		},
		
		showAnswer: function(e) {
			this.subView = 'answerView';
			var entry = this.getCurrentEntry()
			document.getElementById('answer').innerHTML = entry.back;
			document.getElementById('answerDiv').style.display = '';
			document.getElementById('questionDiv').style.display = 'none';
			this.updateView();
		},
		
		showQuestion: function() {
			window.focus();
			this.subView = 'questionView';
			document.getElementById('answerDiv').style.display = 'none';
			document.getElementById('questionDiv').style.display = '';
			
			setTimeout(function() { document.getElementById('scratchPad').focus(); })
		},
		
		getNextPractiseDate: function(entry) {
			var nextPractiseDate
			if (entry.lastSeen === null || entry.lastSeen === undefined) {
				nextPractiseDate = new Date();
			}
			else {
				var lastSeenDate = new Date(entry.lastSeen);
				var daysToAdd;
				if (entry.interval === 1) daysToAdd = 1;
				else if (entry.interval === 2) daysToAdd = 2;
				else daysToAdd = Math.floor(entry.interval * entry.easeFactor);
			console.log('interval', entry.interval, entry.interval === 1, 'daysToAdd', daysToAdd);
				var millisSinceEpoch = lastSeenDate.getTime() + (daysToAdd * 24 * 3600 * 1000);
				var nextPractiseDate = new Date(millisSinceEpoch);
			}
			console.log('last seen', entry.lastSeen, 'next practise date', nextPractiseDate);
			return nextPractiseDate;
		},
		
		isPractiseNow: function(entry) {
			var nextPractiseDate = this.getNextPractiseDate(entry);
			var now = new Date();
			return (nextPractiseDate.getFullYear() === now.getFullYear() &&
					nextPractiseDate.getMonth() === now.getMonth() &&
					nextPractiseDate.getDate() === now.getDate())
		},
		
		setProceedAnyway: function() {
			this.proceedAnyway = true;
			this.showPractiseView();
		},
		
		nextQuestion: function() {
			var questionFound = false;
			var newEntryId = undefined;
			if (this.proceedAnyway && this.entries.length > 0) {
				questionFound = true;
				newEntryId = (this.proceedAnywayCounter % this.entries.length);
				this.proceedAnywayCounter++;
			}
			else {
				for(i = 0; i < this.entries.length; i++) {
					if (this.isPractiseNow(wordsLang.app.entries[i])) {
						questionFound = true;
						newEntryId = i;
					}
				}
			}
			if (questionFound) {
				this.currentQuestionEntryId = newEntryId;
				document.getElementById('question').innerHTML = this.entries[newEntryId].front;
				this.showQuestion();
			}
			else {
				this.activeView = 'nothingToDo';
			}
		},
		
		showPractiseView: function(e) {
			document.getElementById('answerDiv').style.display = 'none';
			document.getElementById('questionDiv').style.display = '';
			wordsLang.app.activeView = 'askView';
			wordsLang.app.nextQuestion();
			wordsLang.app.updateView();
			e && (e.preventDefault());
		},
		
		cleanCreateView: function() {
			this.saveEntryActionElement.setAttribute('entryId', -1);
			this.frontEditElement.value = '';
			this.backEditElement.value = '';
		},
		
		showEntryList: function(e) {
			wordsLang.app.fillFromLocalStorage();
			wordsLang.app.activeView = 'entryList';
			wordsLang.app.updateView();
			e.preventDefault();
		},
		
		editEntry: function(id) {
			this.frontEditElement.value = this.entries[id].front;
			this.backEditElement.value = this.entries[id].back;
			wordsLang.app.activeView = 'editEntry';
			this.saveEntryActionElement.setAttribute('entryId', id);
			wordsLang.app.updateView();
			setTimeout(function() { document.getElementById('frontEdit').focus(); });
		},
		
		modifyEntries: function(modifyingFunc) {
			modifyingFunc();
			this.localTimeStamp = new Date().getTime();
			this.saveToLocalStorage();
			console.log("modifying entries, new date:", this.localTimeStamp);
		},
		
		deleteEntry: function(id) {
			this.modifyEntries( function() {
				this.entries.splice(id, 1);
			}.bindThis(this));
			this.activeView = 'entryList';
			this.updateView();
		},
		
		isSearch: function() {
			return !(document.getElementById('searchBox').value === "");
		},
		
		buildEntryListTableBody: function() {
			var bodyStr = "" 
			for (var i = 0; i < wordsLang.app.entries.length; i++) {
				var currentEntry = this.entries[i];
				var searchValue = document.getElementById('searchBox').value;
				if (!this.isSearch() || (currentEntry.front.indexOf(searchValue) != -1) || 
					(currentEntry.back.indexOf(searchValue) != -1)) {
					bodyStr += "<tr>"
					bodyStr += "<td>" + wordsLang.app.entries[i].front + "</td>"
					bodyStr += "<td>" + wordsLang.app.entries[i].back + "</td>"
					bodyStr += "<td>" + (wordsLang.app.entries[i].lastSeen !== null ? wordsLang.app.getLastSeenStr(wordsLang.app.entries[i]) : "-") + "</td>"
					bodyStr += "<td>" + wordsLang.app.entries[i].interval + "</td>"
					bodyStr += "<td>" + wordsLang.app.entries[i].easeFactor + "</td>"
					bodyStr += "<td>" + this.getDateStr(this.getNextPractiseDate(this.entries[i])) + "</td>"
					bodyStr += "<td><a href='#' onclick='javascript:wordsLang.app.editEntry(" 
							+ i 
							+ "); return false;'>edit</a></td>"
					bodyStr += "<td><a href='#' onclick='javascript:wordsLang.app.deleteEntry(" 
							+ i 
							+ "); return false;'>delete</a></td>"
					bodyStr += "</tr>"
				}
			}
			document.getElementById('entryListTableBody').innerHTML = bodyStr;
		},
		
		respondToKeypress: function(event) {
			if (this.activeView === 'askView' && this.subView === 'answerView') {
				// pressed one of the buttons 0-5
				if (event.charCode > 47 && event.charCode < 54) {
					this.answer(event.charCode - 48);
				}
			}
			else if (this.activeView === 'askView' && this.subView === 'questionView') {
				// pressed SHIFT-ENTER
				if (event.keyCode == 13 && event.shiftKey == true) {
					this.showAnswer();
				}
			}
		},
		
		updateView: function() {
			this.entryCntElement.innerHTML = wordsLang.app.entries.length;
			document.getElementById('entryName').innerHTML = (this.entries.length === 1 ? 'card' : 'cards');
			
			if (this.activeView === 'entryList') {
				wordsLang.app.buildEntryListTableBody();
			}
			else if (this.activeView === 'askView') {
				if(this.subView === 'questionView') {
					document.getElementById("scratchPad").value = "";
					document.getElementById("scratchPad").removeAttribute('disabled');
				} 
				else {
					document.getElementById("scratchPad").setAttribute('disabled', 'disabled');
					document.getElementById("scratchPad").blur();
				}
			}
			else if (this.activeView === 'nothingToDo') {
				if (this.entries.length > 0) {
					document.getElementById('proceedAnyway').style.display = '';
				}
				else {
					document.getElementById('proceedAnyway').style.display = 'none';
				}
			}
			
			for (var i = 0; i < this.views.length; i++) {
				var element = document.getElementById(this.views[i]);
				if (this.activeView === this.views[i]) {
					element.style.display = '';
				}
				else {
					element.style.display = 'none'
				}
			}
			
			if (this.webTimeStamp === undefined) {
				console.log("updateView, webTimeStamp undefined");
				document.getElementById('saveToWebAction').style.display = 'none';
				document.getElementById('loadFromWebAction').style.display = 'none';
				document.getElementById('statusMessage').style.display = '';
			}
			else {
				console.log('updateView:::> localTimeStamp:', this.localTimeStamp, this.localTimeStamp <= this.webTimeStamp ? (this.localTimeStamp === this.webTimeStamp ? '=' : '<') : '>', 'webTimeStamp:', this.webTimeStamp);
				if (this.localTimeStamp === this.webTimeStamp) {
					// saved
					document.getElementById('saveToWebAction').style.display = 'none';
					document.getElementById('loadFromWebAction').style.display = 'none';
					document.getElementById('statusMessage').style.display = 'none';
				}
				else if (this.localTimeStamp > this.webTimeStamp) {
					// saveable
					document.getElementById('saveToWebAction').style.display = '';
					document.getElementById('loadFromWebAction').style.display = 'none';
					document.getElementById('statusMessage').style.display = 'none';
				}
				else {
					// loadable
					document.getElementById('saveToWebAction').style.display = 'none';
					document.getElementById('loadFromWebAction').style.display = '';
					document.getElementById('statusMessage').style.display = 'none';	
				} 
			}
		},
	},
	
	utilities: {
		supportsLocalStorage: function() {
			try {
	  			return 'localStorage' in window && window['localStorage'] !== null;
	  		} catch (e) {
	    		return false;
	  		}
		}
	}
}

window.addEventListener('load', wordsLang.app.init.bindThis(wordsLang.app), true);