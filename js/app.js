/*global angular, alert, console, FileReader, prompt*/
var Tex = angular.module('Tex', ['ES', 'ngSanitize']);

Tex.controller('texCtrl', function ($scope, es, $sce) {
    'use strict';
    $scope.state = {};
    $scope.data = {};
    $scope.facetFilter = [];
    $scope.loadingDocuments = 0;
    $scope.loadingTerms = 0;
    $scope.loadingFacets = 0;
    $scope.currentCase = 0;
    $scope.cases = [];
    $scope.init = function () {
        var password;
        do {
            password = prompt("Password");
        } while (!password || password.length === 0);
        es.params({
            host: "vgc.poly.edu/projects/opsense",
            index: "yelp",
            password: password,
            user: "propublica"
        });
        
        $scope.state.search = "";
        window.addEventListener("hashchange", $scope.loadUrl, false);
        $scope.loadStorage();
        $scope.loadUrl();
        $scope.done = true;
    };
    
    
    
    $scope.facets = [
        {order: 1, title: "Rating", field: "review.rating", directive: "rating"},
        {order: 2, title: "Provider", field: "business.name", directive: "provider"},
        {order: 3, title: "Category", field: "business.category", directive: "provider"},
        {order: 4, title: "State", field: "business.state", directive: "provider"}
    ];
    
    $scope.phrases = [
        {order: 1, title: "Significant", field: "review.rating", directive: "cloud"}
    ];
    
    
    /*Properties -------------------------*/
    $scope.HTML = function (html) {
        return $sce.trustAsHtml(html);
    };
    $scope.filtersList = function (state) {
        var values = [];
        state.filters.forEach(function (f) {
            values.push(f[Object.keys(f)[0]]);
        });
        return values.join(", ");
    };
    /*Actions -----------------------------*/
    $scope.loadUrl = function (url, old) {
        var hash = decodeURIComponent(window.location.hash.substring(1)),
            urlState = {};
        if (hash && hash.length > 0) {
            hash.split("&").forEach(function (v) {
                var arr, param = v.split('='),
                    key = param[0],
                    value = param[1];
                if (!value) {
                    value = "";
                }
                if (value.charAt(0) === '[') {
                    value = value.replace("[", "").replace("]", "");
                    if (value === "") {
                        arr = [];
                    } else {
                        arr = value.split(",").map(function (e) {
                            var el = e.split(":"), r = {};
                            r[el[0]] = el[1];
                            return r;
                        });
                    }
                    urlState[key] = arr;
                } else {
                    urlState[v.split('=')[0]] = v.split('=')[1];
                }
            });
        }
        $scope.loadState(urlState);
    };
    
    $scope.loadState = function (state) {
        $scope.state.search = state.search || "";
        $scope.facetFilter = [];
        if (state.filters) {
            state.filters.forEach(function (sf) {
                var key = Object.keys(sf)[0],
                    facet = $scope.facets.find(function (fc) {return fc.title === key; });
                if (!facet) {
                    alert('Error on the url, facet ' + key + ' do not exists');
                }
                $scope.facetFilter.push({facet: key, field: facet.field, value: sf[key]});
            });
        }
        $scope.loadData();
    };
    
    $scope.stateToUrl = function () {
        var url = "", filters;
        if ($scope.state.search) {
            url += "search=" + $scope.state.search;
        }
        
        url += '&filters=[' + $scope.facetFilter.map(function (f) {
            return f.facet + ":" + f.value;
        }).join(",") + "]";
        window.location.hash = "#" + url;
    };
        
    $scope.saveState = function () {
        var desc = prompt("Provide a description for the state", $scope.state.search),
            state = {
                search: $scope.state.search,
                desc: desc,
                filters: $scope.facetFilter.map(function (f) {
                    var r = {};
                    r[f.facet] = f.value;
                    return r;
                })
            };
        
        $scope.selectedCase.states.push(state);
    };
    
    $scope.saveDocument = function (doc) {
        if ($scope.selectedCase.documents.indexOf(doc) > 0) {
            doc.saved = true;
            return;
        }
        es.getDocument(doc.id, $scope.state.search, 50).then(function (docRes) {
            var document = { id: docRes.id, title: docRes.business.name, details: docRes.high, search: $scope.state.search};
            doc.saved = true;
            $scope.selectedCase.documents.push(document);
            alert('Document Saved');
        });
    };
    
    $scope.selectCase = function ($case) {
        console.log($case);
        $scope.selectedCase = $case;
    };
    
    $scope.removeState = function (idx) {
        $scope.selectedCase.states.splice(idx, 1);
    };
    
    $scope.removeDoc = function (idx) {
        $scope.selectedCase.documents.splice(idx, 1);
    };
    
    $scope.upload = function () {
        var input = document.getElementById("uploadBox");
        input.click();
    };
    
    $scope.loadCases = function (cases) {
        $scope.cases = cases;
        $scope.selectedCase = $scope.cases[0];
        alert('Data loaded');
    };
    
    $scope.downloadCases = function () {
        var pom = document.createElement('a'), event;
        pom.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify($scope.cases)));
        pom.setAttribute('download', "cases.json");

        if (document.createEvent) {
            event = document.createEvent('MouseEvents');
            event.initEvent('click', true, true);
            pom.dispatchEvent(event);
        } else {
            pom.click();
        }
        
    };
    
    $scope.loadStorage = function () {
        var store = JSON.parse(localStorage.getItem("TextExplorer"));
        if (!store) {
            store = [];
            store.push({name: "Default", states: [], documents: []});
        }
        $scope.selectedCase = store[0];
        $scope.cases = store;
    };
    
    $scope.$watch(function () { return $scope.cases; }, function () {$scope.saveStorage(); }, true);
    $scope.saveStorage = function () {
        localStorage.setItem("TextExplorer", JSON.stringify($scope.cases));
    };
    
    $scope.addFacetFilter = function (d, facet) {
        var field = $scope.facets.filter(function (fc) {return fc.title === facet.facet; })[0].field,
            f = {facet: facet.facet, field: field, value: d.key};
        $scope.facetFilter.push(f);
        $scope.doSearch();
    };
    
    $scope.removeFilter = function (f, idx) {
        $scope.facetFilter.splice(idx, 1);
        $scope.doSearch();
    };
    
    $scope.selectDocument = function (doc) {
        var search = doc.search || $scope.state.search;
        es.getDocument(doc.id, search).then(function (docRes) {
            docRes.saved = doc.search ? true : false;
            $scope.state.selectedDocument = docRes;
        });
    };
    
    $scope.appendWord = function (word) {
        if ($scope.state.search && $scope.state.search.length > 0) {
            if ($scope.state.search.indexOf(" ") > 0) {
                $scope.state.search = "(" + $scope.state.search + ")";
            }
            $scope.state.search += " AND " + word;
        } else {
            $scope.state.search = word;
        }
        $scope.doSearch();
    };
    
    /*DB Acitions -------------------------*/
    $scope.doSearch = function () {
        $scope.stateToUrl();
    };
    
    $scope.loadData = function () {
        $scope.getDocuments().then(function () {
            $scope.getFacets();
            $scope.getTerms();
        });
    };
    
    $scope.loadMore = function () {
        $scope.getDocuments($scope.data.docs.length);
    };
    
    $scope.addCase = function () {
        var name;
        do {
            name = prompt("Type a name for the case");
        } while (!name || name.length === 0);
        $scope.cases.push({name: name, states: [], documents: []});
        $scope.selectedCase = $scope.cases[$scope.cases.length - 1];
    };
    
    $scope.removeCase = function (idx) {
        $scope.cases.splice(idx, 1);
    };
    
    $scope.getDocuments = function (existent) {
        $scope.loadingDocuments = true;
        return es.getDocuments($scope.state.search, $scope.facetFilter, existent).then(function (docs) {
            if (existent > 0) {
                $scope.data.docs = $scope.data.docs.concat(docs.docs);
            } else {
                $scope.data.docs = docs.docs;
            }
            $scope.data.total = docs.total;
            $scope.loadingDocuments -= 1;
        });
    };
    
    
    
    $scope.getFacets = function () {
        $scope.loadingFacets += 1;
        es.getFacets($scope.state.search, $scope.facets, $scope.facetFilter).then(function (result) {
            $scope.data.facets = result;
            $scope.loadingFacets -= 1;
        });
    };
    
    $scope.getTerms = function () {
        if ($scope.state.search.length === 0 && $scope.facetFilter.length === 0) {
            return;
        }
        $scope.loadingTerms += 1;
        es.getTerms($scope.state.search, $scope.facetFilter).then(function (result) {
            $scope.data.terms = result;
            $scope.loadingTerms -= 1;
        });
    };
    
});

Tex.directive('ngEnter', function () {
    'use strict';
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});

Tex.directive('ngRightClick', function ($parse) {
    'use strict';
    return function (scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function (event) {
            scope.$apply(function () {
                event.preventDefault();
                fn(scope, {$event: event});
            });
        });
    };
});

Tex.directive("fileread", [function () {
    'use strict';
    return {
        scope: {
            fileread: "="
        },
        link: function (scope, element, attributes) {
            element.bind("change", function (changeEvent) {
                var reader = new FileReader();
                reader.onload = function (loadEvent) {
                    scope.$apply(function () {
                        try {
                            var newCases = JSON.parse(loadEvent.target.result);
                            scope.$parent.loadCases(newCases);
                        } catch (err) {
                            alert('Error loading the file');
                        }
                        
                        
                    });
                };
                reader.readAsText(changeEvent.target.files[0]);
            });
        }
    };
}]);

Tex.filter('list', function () {
    'use strict';
    return function (input) {
        input = input || [];
        var out = input.join(", ");
        return out;
    };
});
Tex.filter('stars', function () {
    'use strict';
    return function (input) {
        var i, out = "";
        input = input || 0;
        for (i = 0; i < input; i += 1) {
            out += '<i class="fa fa-star"></i>';
        }
        return out;
    };
});

