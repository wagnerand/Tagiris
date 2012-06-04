/*
 * Tagiris - a Firefox Extension
 * Copyright (C) 2010 Andreas Wagner
 */

if (!Tagiris) {
    var Tagiris = {

        historyService : Components.classes["@mozilla.org/browser/nav-history-service;1"].getService(Components.interfaces.nsINavHistoryService),
        prefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.Tagiris."),

        searchBox : null,
        toolbar : null,

        init : function () {
            searchBox = document.getElementById("TagirisSearchBox");
            toolbar = Object.create(PlacesToolbar.prototype);

            var popup = document.getElementById("editBookmarkPanel");
            popup.addEventListener('popupshown', function(event) {
                Tagiris.updatePanel(event);
            }, false);

            toolbar._viewElt = document.getElementById("TagirisToolbar");
            toolbar._rootElt = document.getElementById("TagirisToolbarItems");
            toolbar._dropIndicator = document.getElementById("TagirisToolbarDropIndicator");
            toolbar._chevron = document.getElementById("TagirisChevron");
            toolbar._chevronPopup = document.getElementById("TagirisChevronPopup");
            toolbar._viewElt._placesView = toolbar;
            toolbar._addEventListeners(toolbar._viewElt, toolbar._cbEvents, false);
            toolbar._addEventListeners(toolbar._rootElt, ["popupshowing", "popuphidden"], true);
            toolbar._addEventListeners(toolbar._rootElt, ["overflow", "underflow"], true);
            toolbar._addEventListeners(window, ["resize", "unload"], false);

            searchBox.value = Tagiris.prefs.getCharPref("contextTags");
            Tagiris.showContextResults();

            toolbar._viewElt.addEventListener("dragstart", function(event) { event.stopPropagation(); }, true);
            toolbar._viewElt.addEventListener("dragover", function(event) { event.stopPropagation(); }, true);
            toolbar._viewElt.addEventListener("dragexit", function(event) { event.stopPropagation(); }, true);
            toolbar._viewElt.addEventListener("dragend", function(event) { event.stopPropagation(); }, true);
            toolbar._viewElt.addEventListener("drop", function(event) { event.stopPropagation(); }, true);
        },

        updatePanel : function(event) {
            var tagsField = document.getElementById("editBMPanel_tagsField");
            if (event.target != document.getElementById("editBookmarkPanel"))
                return;
            if (tagsField.value != "") {
                var searchTagString = searchBox.value;
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
                tagsField.value = searchBox.value.trim();
            }
        },

        showContextResults : function() {
            var searchText = searchBox.value.replace(/\s+/g, " ").trim();
            if (searchText.lastIndexOf(",") == searchText.length - 1) {
                searchText = searchText.substring(0, searchText.length - 1);
            }
            var tags = searchText.split(",");
            for (var i = 0; i < tags.length; i++) {
                tags[i] = tags[i].trim();
            }
            Tagiris.prefs.setCharPref("contextTags", searchText);

            if (searchText.length > 0) {
                var query = Tagiris.historyService.getNewQuery();
                var options = Tagiris.historyService.getNewQueryOptions();

                query.tags = tags;
                options.excludeQueries = true;
                options.queryType = 1;
                options.sortingMode = 4;

                PlacesViewBase.call(toolbar, Tagiris.historyService.queriesToQueryString([query], 1, options));
            }
        }
    };
}

window.addEventListener("load", function() { Tagiris.init(); }, true);
