
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
				
				document.getElementById('createNewAction').addEventListener('click', wordsLang.app.addEntry, true);
				this.saveEntryActionElement.addEventListener('click', wordsLang.app.saveEntry, true);
				document.getElementById('showEntryListAction').addEventListener('click', wordsLang.app.showEntryList, true);
				document.getElementById('practiseAction').addEventListener('click', wordsLang.app.showPractiseView, true);
				document.getElementById('showAnswerAction').addEventListener('click', this.showAnswer, true);
				
				answerActionElements = document.getElementsByName('answeredAction')
				for(var i = 0; i < answerActionElements.length; i++) {
					answerActionElements[i].addEventListener('click', this.answer, true);
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
					lastSeen: lastSeen
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
		
		answer: function() {
			var quality = parseInt(this.getAttribute('value'))
			var entry = wordsLang.app.getCurrentEntry();
			var now = new Date();
			entry.lastSeen = now;
			entry.interval++;
			entry.easeFactor = entry.easeFactor +(0.1-(5-quality)*(0.08+(5-quality)*0.02))
			wordsLang.app.saveToLocalStorage();
		},
		
		addEntry: function(e) {
			wordsLang.app.cleanCreateView();
			wordsLang.app.activeView = 'editEntry';
			wordsLang.app.updateView();
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
			var entry = wordsLang.app.getCurrentEntry()
			document.getElementById('answer').innerHTML = entry.back;
			document.getElementById('answerDiv').style.display = '';
			document.getElementById('questionDiv').style.display = 'none';
		},
		
		isPractiseNow: function(entry) {
			if (entry.lastSeen === null || entry.lastSeen === undefined) {
				return true;
			}
			else {
				var nextPractiseDate
				if (entry.interval === 1) {
					nextPractiseDate = (entry.lastSeen + 1)
				}
				else if (entry.interval === 2) {
					nextPractiseDate = (entry.lastSeen + 2)
				}
				else {
					nextPractiseDate = (entry.lastSeen + Math.floor(entry.interval * entry.easeFactor))
				}
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
				bodyStr += "<td>" + wordsLang.app.getDateStr(wordsLang.app.entries[i].lastSeen) + "</td>"
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
		
		updateView: function() {
			this.entryCntElement.innerHTML = wordsLang.app.entries.length;
			if (this.activeView === 'entryList') {
				wordsLang.app.buildEntryListTableBody();
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