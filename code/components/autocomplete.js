Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const Ci = Components.interfaces;

const CLASS_ID = Components.ID("dbaf1efb-c7e7-4b7a-88ee-e36458309a4b");
const CLASS_NAME = "Tagiris Related Tags AutoComplete";
const CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=tagiris-related-tags";

function sortByNumericValue(A) {
	/*
	 * sorts the array by value
	 * @param A - The unsorted array that should be sorted
	 */
    B = [];
    result = {};
    for (i in A) B.push({ "v": i, "c": A[i] });
    B.sort(function (x, y){return y.c - x.c;});
    for (i in B){result[B[i].v] = B[i].c;}
    return result;
}

// Implements nsIAutoCompleteResult
function TagirisAutoCompleteResult(searchString, searchResult,
                                  defaultIndex, errorDescription,
                                  results, comments) {
  this._searchString = searchString;
  this._searchResult = searchResult;
  this._defaultIndex = defaultIndex;
  this._errorDescription = errorDescription;
  this._results = results;
  this._comments = comments;
}

TagirisAutoCompleteResult.prototype = {
  _searchString: "",
  _searchResult: 0,
  _defaultIndex: 0,
  _errorDescription: "",
  _results: [],
  _comments: [],

  /**
   * The original search string
   */
  get searchString() {
    return this._searchString;
  },

  /**
   * The result code of this result object, either:
   *         RESULT_IGNORED   (invalid searchString)
   *         RESULT_FAILURE   (failure)
   *         RESULT_NOMATCH   (no matches found)
   *         RESULT_SUCCESS   (matches found)
   */
  get searchResult() {
    return this._searchResult;
  },

  /**
   * Index of the default item that should be entered if none is selected
   */
  get defaultIndex() {
    return this._defaultIndex;
  },

  /**
   * A string describing the cause of a search failure
   */
  get errorDescription() {
    return this._errorDescription;
  },

  /**
   * The number of matches
   */
  get matchCount() {
    return this._results.length;
  },

  /**
   * Get the value of the result at the given index
   */
  getValueAt: function(index) {
    return this._results[index];
  },

  /**
   * Get the comment of the result at the given index
   */
  getCommentAt: function(index) {
    return this._comments[index];
  },

  /**
   * Get the style hint for the result at the given index
   */
  getStyleAt: function(index) {
    if (!this._comments[index])
      return null;  // not a category label, so no special styling

    if (index == 0)
      return "suggestfirst";  // category label on first line of results

    return "suggesthint";   // category label on any other line of results
  },

  /**
   * Get the image for the result at the given index
   * The return value is expected to be an URI to the image to display
   */
  getImageAt : function (index) {
    return "";
  },

  /**
   * Remove the value at the given index from the autocomplete results.
   * If removeFromDb is set to true, the value should be removed from
   * persistent storage as well.
   */
  removeValueAt: function(index, removeFromDb) {
    this._results.splice(index, 1);
    this._comments.splice(index, 1);
  },
  
  getLabelAt: function(index) {
      return this._results[index];
  },  

  QueryInterface: function(aIID) {
    if (!aIID.equals(Ci.nsIAutoCompleteResult) && !aIID.equals(Ci.nsISupports))
        throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
};


// Implements nsIAutoCompleteSearch
function TagirisAutoCompleteSearch() {
}


TagirisAutoCompleteSearch.prototype = {
	
	classDescription : CLASS_NAME,
	classID : CLASS_ID,
	contractID : CONTRACT_ID,
	
  /*
   * Search for a given string and notify a listener (either synchronously
   * or asynchronously) of the result
   *
   * @param searchString - The string to search for
   * @param searchParam - An extra parameter
   * @param previousResult - A previous result to use for faster searching
   * @param listener - A listener to notify when the search is complete
   */
  startSearch: function(searchString, searchParam, result, listener) {
	var historyService = Components.classes["@mozilla.org/browser/nav-history-service;1"].getService(Components.interfaces.nsINavHistoryService);

	var results = [];
	var comments = [];

	if ((searchString.length > 0) && ((searchString.substr(-1) == ",") || (searchString.substr(-2) == ", "))) {
		var inpTags = [];
		var inpArrayString = "";
		var tempTags = searchString.split(",");
		// input String -> input tags array
		for (var i = 0; i < tempTags.length; i++) {
			tempTags[i] = tempTags[i].trim();
			if (tempTags[i] != "") {
				inpTags.push(tempTags[i]);
				inpArrayString += tempTags[i] + ", ";
			}
		}
		if (inpTags.length == 0) {
			return;
		}
		

		var query = historyService.getNewQuery();
	    var options = historyService.getNewQueryOptions();

	    query.tags = inpTags;
	    options.excludeQueries = true;
	    options.queryType = options.QUERY_TYPE_BOOKMARKS;
	    options.sortingMode = options.SORT_BY_DATEADDED_DESCENDING;
		
	    var queryResult = historyService.executeQuery(query, options);
	    var cont = queryResult.root;
        cont.containerOpen = true;

        // history query result -> used tags array
	    var tags = [];
	    for (var i = 0; i < cont.childCount; i++) {
	        var node = cont.getChild(i);
	        var nodeTags = node.tags.split(",");
	        for (var j = 0; j < nodeTags.length; j++) {
	        	tags.push(nodeTags[j].trim());
	        }
	    }
		cont.containerOpen = false;

	    tags.sort();	// -> the 2nd sort key of the results is the alphabet
		tags.push("");
	    var tagCountArray = [];	// key: tag ; value: number of appears
		var isInputTag = false;
	    for (var i = 0; i < tags.length; i++) {
			for (var k = 0; k < inpTags.length; k++) {
				if (tags[i] == inpTags[k]) {
					isInputTag = true;
					break;
				}
			}
	    	if ((!isInputTag) && (tags[i] != "")) {
		    	if (tagCountArray[tags[i]] > 0) {
		    		tagCountArray[tags[i]] = tagCountArray[tags[i]] + 1;	// increases appear counter of the current tag (tags[i])
		    	} else {
		    		tagCountArray[tags[i]] = 1;
		    	}
	    	}
			isInputTag = false;
		}
	    tagCountArray = sortByNumericValue(tagCountArray);	// sorts the associative array by values (appearCount)
	    for (var tag in tagCountArray) {
	    	comments.push(tagCountArray[tag] + (tagCountArray[tag] > 1 ? " Bookmarks" : " Bookmark"));
	    	results.push(inpArrayString + tag);
	    }

	} else if ((searchString.indexOf(",") == -1) && (searchString.indexOf(" ") != -1)) {	// there is no comma and at least one space in the search string
		var correctString = searchString.trim().replace(/ +/g,", ");	// replaces all whitespaces (single and multiple) with a ", "
		comments.push("Did you mean: " + correctString + " ?");	// suggests the new string
		results.push(correctString);
	}
    var newResult = new TagirisAutoCompleteResult(searchString, Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 0, "", results, comments);
    listener.onSearchResult(this, newResult);
  },

  /*
   * Stop an asynchronous search that is in progress
   */
  stopSearch: function() {
  },

  QueryInterface: function(aIID) {
    if (!aIID.equals(Ci.nsIAutoCompleteSearch) && !aIID.equals(Ci.nsISupports))
        throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
};

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([TagirisAutoCompleteSearch]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([TagirisAutoCompleteSearch]);
