/* global Module */

/* Magic Mirror
 * Module: Trello
 *
 * By Joseph Bethge
 * MIT Licensed.
 */

Module.register("MMM-Trello", {

	// Default module config.
	defaults: {
		reloadInterval: 5 * 60 * 1000, // every 10 minutes
		updateInterval: 10 * 1000, // every 10 seconds
		animationSpeed: 2.5 * 1000, // 2.5 seconds
		showTitle: true,
		api_key: "",
		token: "",
		list: "",
		showLineBreaks: false,
		showDueDate: true,
		showChecklists: true,
		showChecklistTitle: false
	},

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);

		moment.locale(config.language);

		this.listContent = [];
		this.checklistData = {};

		this.activeItem = 0;

		this.loaded = false;
		this.error = false;
		this.errorMessage = "";
		this.retry = true;

		this.setTrelloConfig();

		this.requestUpdate();
		this.scheduleUpdateRequestInterval();
	},

	/* scheduleVisualUpdateInterval()
	 * Schedule visual update.
	 */
	scheduleVisualUpdateInterval: function() {
		var self = this;

		self.updateDom(self.config.animationSpeed);

		setInterval(function() {
			self.activeItem++;
			self.updateDom(self.config.animationSpeed);
		}, this.config.updateInterval);
	},

	/* scheduleUpdateRequestInterval()
	 * Schedule visual update.
	 */
	scheduleUpdateRequestInterval: function() {
		var self = this;

		setInterval(function() {
			if (self.retry)
			{
				self.requestUpdate();
			}
		}, this.config.reloadInterval);
	},

	// Define required styles.
	getStyles: function() {
		return ["font-awesome.css"];
	},

	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	},

	// Override required translations.
	getTranslations: function() {
		return {
			en: "translations/en.json",
			de: "translations/de.json"
		};
	},

	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");

		if (this.activeItem >= this.listContent.length) {
			this.activeItem = 0;
		}

		if (this.loaded) {
			if (this.listContent.length == 0) {
				wrapper.innerHTML = this.translate("NO_CARDS");
				wrapper.className = "small dimmed";
			}
			else
			{
				if (this.config.showTitle || this.config.showDueDate) {
					var name = document.createElement("div");
					name.className = "bright medium light";

					content = ""
					if (this.config.showTitle)
					{
						content = this.listContent[this.activeItem].name;
					}

					if (this.config.showDueDate && this.listContent[this.activeItem].due)
					{
						if (this.config.showTitle)
						{
							content += " (" + moment(this.listContent[this.activeItem].due).fromNow() + ")";
						}
						else
						{
							content += moment(this.listContent[this.activeItem].due).fromNow() + ":";
						}
					}

					name.innerHTML = content;

					wrapper.appendChild(name);
				}
				var desc = document.createElement("div");
				desc.className = "small light";

				content = this.listContent[this.activeItem].desc;

				if (this.config.showLineBreaks)
				{
					var lines = content.split('\n');

					for (var i in lines) {
						var lineElement = document.createElement("div");
						lineElement.innerHTML = lines[i];
						desc.appendChild(lineElement);
					}
				}
				else
				{
					desc.innerHTML = content;
				}
				wrapper.appendChild(desc);

				if (this.config.showChecklists) {
					var checklistWrapper = document.createElement("div");
					this.getChecklistDom(checklistWrapper);
					wrapper.appendChild(checklistWrapper);
				}
			}
		} else {
			if (this.error)
			{
				wrapper.innerHTML = "Please check your config file, an error occured: " + this.errorMessage;
				wrapper.className = "xsmall dimmed";
			}
			else
			{
				wrapper.innerHTML = this.translate("LOADING");
				wrapper.className = "small dimmed";
			}
		}

		return wrapper;
	},

	/* getChecklistDom()
	 * return the dom for all checklists on current card
	 */
	getChecklistDom: function(wrapper) {
		const SYMBOL = Object.freeze({
			"incomplete" : "fa-square-o",
			"complete" : "fa-check-square-o"
		})

		var checklistIDs = this.listContent[this.activeItem].idChecklists
		for (var id in checklistIDs)
		{
			if (checklistIDs[id] in this.checklistData)
			{
				var checklist = this.checklistData[checklistIDs[id]];
				if (this.config.showChecklistTitle)
				{
					var titleElement = document.createElement("div");
					titleElement.className = "bright medium light";
					titleElement.innerHTML = checklist.name;
					wrapper.appendChild(titleElement);
				}

				for (var item in checklist.checkItems)
				{
					var itemWrapper = document.createElement("div");
					itemWrapper.className = "small light";

					var itemSymbol =  document.createElement("span");
					itemSymbol.className = "fa " + SYMBOL[checklist.checkItems[item].state];
					itemWrapper.appendChild(itemSymbol);

					var itemName = document.createElement("span");
					itemName.innerHTML = " " + checklist.checkItems[item].name;
					itemWrapper.appendChild(itemName);

					wrapper.appendChild(itemWrapper);
				}
			}
			else
			{
				wrapper.innerHTML = this.translate("LOADING");
				wrapper.className = "small dimmed";
			}
		}
	},

	/* setTrelloConfig()
	 * intializes trello backend
	 */
	setTrelloConfig: function() {
		this.sendSocketNotification("TRELLO_CONFIG", { api_key: this.config.api_key, token: this.config.token });
	},

	/* requestUpdate()
	 * request a list content update
	 */
	requestUpdate: function() {
		this.sendSocketNotification("REQUEST_LIST_CONTENT", { list: this.config.list });
	},

	// Override socket notification handler.
	socketNotificationReceived: function(notification, payload) {
		if (notification === "TRELLO_ERROR") {
			this.errorMessage = "Error " + payload.statusCode + "(" + payload.statusMessage + "): " + payload.responseBody;
			Log.error(this.errorMessage);

			if (payload.statusCode == 401 || payload.statusCode == 400) {
				this.error = true;
				this.retry = false;
				this.updateDom(self.config.animationSpeed);
			}
		}
		if (notification === "LIST_CONTENT") {
			this.error = false;

			this.listContent = payload;

			if (!this.loaded) {
				this.scheduleVisualUpdateInterval();
				this.loaded = true;
			}
		}
		if (notification === "CHECK_LIST_CONTENT") {
			this.checklistData[payload.id] = payload;
		}
	},
});
