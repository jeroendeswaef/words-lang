if (typeof console === 'undefined') {
	console = {
		log: function() {}
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
				window.addEventListener('keypress', this.respondToKeypress.bindThis(this), true);
				
				answerActionElements = document.getElementsByName('answeredAction')
				for(var i = 0; i < answerActionElements.length; i++) {
					answerActionElements[i].addEventListener('click', this.answer.bindThis(this), true);
				}
				
				this.fillFromLocalStorage();
				this.nextQuestion();
				this.updateView();
			}
			else {
				alert("browser doesn't have local storage");
			}
		},
		
		fillFromLocalStorage: function() {
			wordsLang.app.entries = []
			for(var i = 0; i < localStorage.length; i++) {
				var str = localStorage.getItem(localStorage.key(i));
				var parts = str.split("|-|");
				var lastSeen = null
				if (parts[2] && parts[2] != "") {
					lastSeen = new Date(	parseInt(parts[2].split('-')[0]), 
											parseInt(parts[2].split('-')[1]), 
											parseInt(parts[2].split('-')[2]), 0, 0, 0)
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
		},
		
		saveToLocalStorage: function() {
			localStorage.clear();
			for(var i = 0; i < wordsLang.app.entries.length; i++) {
				var entry = wordsLang.app.entries[i];
				var lastSeenStr = "";
				if(entry.lastSeen) {
					lastSeenStr = entry.lastSeen.getFullYear() + "-" + entry.lastSeen.getMonth()
						+ "-" + entry.lastSeen.getDate();
				}
				var entryStr = entry.front + "|-|" + entry.back + "|-|" 
					+ lastSeenStr + "|-|" + entry.interval + "|-|" + entry.easeFactor
				localStorage.setItem("wordsLangEntry-" + i, entryStr);
			}
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
			console.log("answer, quality: " + quality + ", new interval: " + entry.interval);
			this.entries[this.currentQuestionEntryId] = entry;
			this.saveToLocalStorage();
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
					//event.preventDefault();
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

wordsLang.app.init();