/*
 * Tagiris - a Firefox Extension
 * Copyright (C) 2010 Andreas Wagner
 */

// See https://bugzilla.mozilla.org/show_bug.cgi?id=550175

if (!Tagiris) {
    var Tagiris = {

        historyService : Components.classes["@mozilla.org/browser/nav-history-service;1"].getService(Components.interfaces.nsINavHistoryService),
        prefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.Tagiris."),

        searchBox : null,
        toolbar : null,

        init : function () {
            let popup = document.getElementById("editBookmarkPanel");
            popup.addEventListener('popupshown', function(event) {
                Tagiris.updatePanel(event);
            }, false);

            this.searchBox = document.getElementById("TagirisSearchBox");
            this.toolbar = Object.create(PlacesToolbar.prototype);

            this.toolbar._viewElt = document.getElementById("TagirisToolbar");
            this.toolbar._rootElt = document.getElementById("TagirisToolbarItems");
            this.toolbar._dropIndicator = document.getElementById("TagirisToolbarDropIndicator");
            this.toolbar._chevron = document.getElementById("TagirisChevron");
            this.toolbar._chevronPopup = document.getElementById("TagirisChevronPopup");
            this.toolbar._viewElt._placesView = this.toolbar;
            this.toolbar._addEventListeners(this.toolbar._viewElt, this.toolbar._cbEvents, false);
            this.toolbar._addEventListeners(this.toolbar._rootElt, ["popupshowing", "popuphidden"], true);
            this.toolbar._addEventListeners(this.toolbar._rootElt, ["overflow", "underflow"], true);
            this.toolbar._addEventListeners(window, ["resize", "unload"], false);

            PlacesViewBase.call(this.toolbar, null);

            this.searchBox.value = this.prefs.getCharPref("contextTags");
            this.showContextResults.call(this);

            this.toolbar._viewElt.addEventListener("dragstart", function(event) { event.stopPropagation(); }, true);
            this.toolbar._viewElt.addEventListener("dragover", function(event) { event.stopPropagation(); }, true);
            this.toolbar._viewElt.addEventListener("dragexit", function(event) { event.stopPropagation(); }, true);
            this.toolbar._viewElt.addEventListener("dragend", function(event) { event.stopPropagation(); }, true);
            this.toolbar._viewElt.addEventListener("drop", function(event) { event.stopPropagation(); }, true);
        },

        updatePanel : function(event) {
            var tagsField = document.getElementById("editBMPanel_tagsField");
            if (event.target != document.getElementById("editBookmarkPanel"))
                return;
            if (tagsField.value != "") {
                var searchTagString = Tagiris.searchBox.value;
                var oldTagString = tagsField.value;
                var newTagString = searchTagString + "," + oldTagString + ",";
                var tempTags = newTagString.replace(/,\s+/g, ",").replace(/\s+,/g, ",").split(",");
                var newTags = [];
                tempTags.sort();
                for (var i = 1; i < tempTags.length; i++) {
                    if (tempTags[i-1] != tempTags[i]) {
                        newTags.push(tempTags[i]);
                    }
                }
                tagsField.value = newTags.join(", ");
            } else {
                tagsField.value = Tagiris.searchBox.value.trim();
            }
        },

        showContextResults : function() {
            var searchText = this.searchBox.value.replace(/\s+/g, " ").trim();
            if (searchText.lastIndexOf(",") == searchText.length - 1) {
                searchText = searchText.substring(0, searchText.length - 1);
            }
            var tags = searchText.split(",");
            for (var i = 0; i < tags.length; i++) {
                tags[i] = tags[i].trim();
            }
            this.prefs.setCharPref("contextTags", searchText);

            if (searchText.length > 0) {
                var query = this.historyService.getNewQuery();
                var options = this.historyService.getNewQueryOptions();

                query.tags = tags;
                options.excludeQueries = true;
                options.queryType = 1;
                options.sortingMode = 4;

                PlacesViewBase.call(this.toolbar, this.historyService.queriesToQueryString([query], 1, options));
            } else {
                while (this.toolbar._rootElt.hasChildNodes()) {
                    this.toolbar._rootElt.removeChild(this.toolbar._rootElt.firstChild);
                }
            }
        }
        
    };
}

window.addEventListener("load", function() { Tagiris.init(); }, true);
