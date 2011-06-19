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
				
				document.getElementById('createNewAction').addEventListener('click', this.addEntry.bindThis(this), true);
				this.saveEntryActionElement.addEventListener('click', wordsLang.app.saveEntry, true);
				document.getElementById('showEntryListAction').addEventListener('click', wordsLang.app.showEntryList, true);
				document.getElementById('practiseAction').addEventListener('click', wordsLang.app.showPractiseView, true);
				document.getElementById('showAnswerAction').addEventListener('click', this.showAnswer.bindThis(this), true);
				document.getElementById('saveToWebAction').addEventListener('click', this.saveToWeb.bindThis(this), true);
				document.getElementById('loadFromWebAction').addEventListener('click', this.loadFromWeb.bindThis(this), true);
				window.addEventListener('keypress', this.respondToKeypress.bindThis(this), true);
				
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
		
		fillFromLocalStorage: function() {
			console.log('fillFromLocalStorage, timeStamp: ' + localStorage.getItem("wordsLangTimeStamp"));
			wordsLang.app.entries = []
			wordsLang.app.localTimeStamp = parseInt(localStorage.getItem("wordsLangTimeStamp"));
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
						interval: parts[3],
						easeFactor: parts[4]
					}
					wordsLang.app.entries.push(entry);
				}
			}
		},
		
		getLastSeenStr: function(entry) {
			var lastSeenStr = "";
			if(entry.lastSeen) {
				lastSeenStr = entry.lastSeen.getFullYear() + "-" + entry.lastSeen.getMonth()
					+ "-" + entry.lastSeen.getDate();
			}
			return lastSeenStr;
		},
		
		getLastSeen: function(lastSeenStr) {
			return new Date(	parseInt(lastSeenStr.split('-')[0]), 
									parseInt(lastSeenStr.split('-')[1]), 
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
			console.log('save to web', jsonStr);
			if(this.externalStorage != null) {
				this.externalStorage.save(jsonStr, this.updateView.bindThis(this));
			}
			event.preventDefault();
		},
		
		loadFromWeb: function(event) {
			console.log('load from web');
			if(this.externalStorage != null) {
				this.externalStorage.load(this.loadedFromWeb);
			}
			if (event) event.preventDefault();
		},
		
		loadedFromWeb: function(jsonStr) {
			var obj = JSON.parse(jsonStr);
			console.log('loadedFromWeb, localtimestamp: ' + wordsLang.app.localTimeStamp + ', servertime: ' + obj.savedTimeStamp);
			if (wordsLang.app.localTimeStamp < obj.savedTimeStamp) {
				wordsLang.app.fillFromWeb(obj.entries);
				wordsLang.app.localTimeStamp = obj.savedTimeStamp;
				wordsLang.app.saveToLocalStorage();
			} 
			wordsLang.app.webTimeStamp = obj.savedTimeStamp;
			wordsLang.app.updateView();
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
			wordsLang.app.wordsLib.set(obj);
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
			this.entries[this.currentQuestionEntryId] = entry;
			this.saveToLocalStorage();
			this.nextQuestion();
			this.updateView();
		},
		
		addEntry: function(e) {
			this.cleanCreateView();
			this.activeView = 'editEntry';
			/*var div = MathJax.HTML.Element(
			  "div",
			  {id: "MathDiv", style:{border:"1px solid", padding:"5px"}},
			  ["Here is math: $x+1$",["br"],"and a display $$x+1\\over x-1$$"]
			);*/
			//document.getElementById('editEntry').appendChild(div);
			//var math = document.getElementById("MathExample");
			//MathJax.Hub.Queue(["Typeset",MathJax.Hub,div]);
			
			this.updateView();
			e.preventDefault();
		},
		
		saveEntry: function(e) {
			var entryId = parseInt(this.getAttribute('entryId'));
			var index = (entryId !== -1 ? entryId : wordsLang.app.entries.length);
			var entry = {
				front: wordsLang.app.frontEditElement.value,
				back: wordsLang.app.backEditElement.value,
				lastSeen: null,
				interval: 0,
				easeFactor: 2.5
			};
			wordsLang.app.entries[index] = entry;
			wordsLang.app.saveToLocalStorage();
			if (entryId !== -1) {
				wordsLang.app.activeView = 'entryList';
			}
			wordsLang.app.cleanCreateView();
			wordsLang.app.updateView();
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
		
		isPractiseNow: function(entry) {
			if (entry.lastSeen === null || entry.lastSeen === undefined) {
				return true;
			}
			else {
				var nextPractiseDate
				var lastSeenDate = new Date(entry.lastSeen);
				var daysToAdd;
				if (entry.interval === 1) daysToAdd = 1;
				else if (entry.interval === 2) daysToAdd = 2;
				else daysToAdd = Math.floor(entry.interval * entry.easeFactor);
				
				var millisSinceEpoch = lastSeenDate.getTime() + (daysToAdd * 24 * 3600 * 1000);
				var nextPractiseDate = new Date(millisSinceEpoch);
				console.log("isPractiseNow, daysToAdd: " + daysToAdd + ", lastSeenDate: " + lastSeenDate + ", nextPractiseDate: " + nextPractiseDate);
				var now = new Date();
				return (nextPractiseDate.getFullYear() === now.getFullYear() &&
						nextPractiseDate.getMonth() === now.getMonth() &&
						nextPractiseDate.getDate() === now.getDate())
			}
		},
		
		nextQuestion: function() {
			var questionFound = false
			for(var i = 0; i < this.entries.length; i++) {
				if (this.isPractiseNow(wordsLang.app.entries[i])) {
					questionFound = true
					this.currentQuestionEntryId = i
					this.showQuestion();
					document.getElementById('question').innerHTML = this.entries[i].front
				}
			}
			if (! questionFound) this.activeView = 'nothingToDo';
		},
		
		showPractiseView: function(e) {
			document.getElementById('answerDiv').style.display = 'none';
			document.getElementById('questionDiv').style.display = '';
			wordsLang.app.activeView = 'askView';
			wordsLang.app.nextQuestion();
			wordsLang.app.updateView();
			e.preventDefault();
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
		},
		
		deleteEntry: function(id) {
			wordsLang.app.entries.splice(id, 1);
			wordsLang.app.saveToLocalStorage();
			wordsLang.app.activeView = 'entryList';
			wordsLang.app.updateView();
		},
		
		getDateStr: function(date) {
			if (date instanceof Date) {
				return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate()
			}
			else {
				return date
			}
		},
		
		buildEntryListTableBody: function() {
			var bodyStr = "" 
			for (var i = 0; i < wordsLang.app.entries.length; i++) {
				bodyStr += "<tr>"
				bodyStr += "<td>" + wordsLang.app.entries[i].front + "</td>"
				bodyStr += "<td>" + wordsLang.app.entries[i].back + "</td>"
				bodyStr += "<td>" + (wordsLang.app.entries[i].lastSeen !== null ? wordsLang.app.getDateStr(wordsLang.app.entries[i].lastSeen) : "-") + "</td>"
				bodyStr += "<td>" + wordsLang.app.entries[i].interval + "</td>"
				bodyStr += "<td>" + wordsLang.app.entries[i].easeFactor + "</td>"
				bodyStr += "<td><a href='#' onclick='javascript:wordsLang.app.editEntry(" 
						+ i 
						+ "); return false;'>edit</a></td>"
				bodyStr += "<td><a href='#' onclick='javascript:wordsLang.app.deleteEntry(" 
						+ i 
						+ "); return false;'>delete</a></td>"
				bodyStr += "</tr>"
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
			else if (this.activeView === 'editEntry') {
				setTimeout(function() { document.getElementById('frontEdit').focus(); });
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
			console.log('updateView:::> localTimeStamp:', this.localTimeStamp, this.localTimeStamp <= this.webTimeStamp ? (this.localTimeStamp === this.webTimeStamp ? '=' : '<') : '>', 'webTimeStamp:', this.webTimeStamp);
			if (this.localTimeStamp === this.webTimeStamp) {
				// saved
				document.getElementById('saveToWebAction').style.display = 'none';
				document.getElementById('loadFromWebAction').style.display = 'none';
				document.getElementById('savedMessage').style.display = '';
			}
			else if (this.localTimeStamp > this.webTimeStamp) {
				// saveable
				document.getElementById('saveToWebAction').style.display = '';
				document.getElementById('loadFromWebAction').style.display = 'none';
				document.getElementById('savedMessage').style.display = 'none';
			}
			else {
				// loadable
				document.getElementById('saveToWebAction').style.display = 'none';
				document.getElementById('loadFromWebAction').style.display = '';
				document.getElementById('savedMessage').style.display = 'none';	
			} 
		},
		
		wordsLib: {
			set: function(obj) {
				console.log('setting... ' + obj);
				wordsLang.app.entries = obj;
			}
		}
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