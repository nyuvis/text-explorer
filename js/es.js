/*global angular, console, d3, Utils*/
/*jslint nomen: true*/
var ES = angular.module('ES', ['elasticsearch']);
ES.factory('es', function (esFactory) {
    'use strict';
    var self = {}, size = 100,
        myStop = ["i", "my", "dr", "me", "you", "so", "all", "he", "she", "it", "they", "we", "our"];
    
    self.params = function (params) {
        Object.keys(params).forEach(function (p) {
            self[p] = params[p];
        });
    };
    self.client = function () {
        if (self._client) {
            return self._client;
        }
        
        var host = "";
        if (self.user && self.user.length > 0) {
            host = "http://" + self.user + ":" + self.password + "@" + self.host;
        } else {
            host = "http://" + self.host;
        }
        
        
        self._client = esFactory({
            host: host,
            apiVersion: '1.4',
            requestTimeout : 600000
        });
        return self._client;
    };
    
    /*Queries Parts -------------------------*/
    self.highlight = function () {
        return {
            "fields": {
                "review.text": {
                    "fragment_size" : 300,
                    "number_of_fragments" : 3,
                    "no_match_size": 300
                }
            }
        };
    };
    
    self.query = function (search, facets, id) {
        search = search || "";
        var q = [];
        if (search.length > 0) {
            q.push("review.text:(" + search + ")");
        }
        
        if (facets.length > 0) {
            q.push("(" + facets.map(function (f) {return f.field + ":" + '"' + f.value + '"'; }).join(" AND ") + ")");
        }
        
        if (id) {
            q.push("_id:" + id);
        }
        
        if (q.length === 0) {
            return {"match_all": {}};
        } else {
            search = q.join(" AND ");
        }
        
        return {
            "query_string": {
                "query": search
            }
        };
    };
    
    self.agg = function (field, significant) {
        if (significant) {
            return {
                "significant_terms": {
                    "field": field,
                    "size": 500,
                    "min_doc_count": 1,
                    "script_heuristic": {
                        "script": "_subset_freq"
                    }
                }
            };
        } else {
            return {
                "terms": {
                    "field": field,
                    "size": 500
                }
            };
        }
        
    };
    
    self.getDocument = function (id, search, fragSize) {
        var numFrags = fragSize ? 3 : 0,
            noMatch = fragSize ? 50 : 1000000,
            
            query = {
                query: self.query(search, [], id),
                highlight: {
                    "fields": {
                        "review.text": {
                            "fragment_size" : fragSize,
                            "number_of_fragments" : numFrags,
                            "no_match_size": noMatch
                        }
                    }
                }
            };
        return self.client().search({
            index: self.index,
            type: "reviews",
            size: size,
            body: query
        }).then(function (result) {
            var docs = result.hits.hits;
            docs = docs.map(function (d) {
                var newD = d._source;
                newD.text = d.highlight["review.text"][0];
                newD.high = d.highlight["review.text"];
                newD.t1 = newD.text[newD.text.length - 1];
                newD.t2 = newD.review.text[newD.review.text.length - 1];
                newD.id = d._id;
                if (newD.text[newD.text.length - 1] !== newD.review.text[newD.review.text.length - 1]) {
                    newD.text = newD.text + "...";
                }
                
                return newD;
            });
            return docs[0];
        });
    };
    
    /*Requests ---------------------------*/
    self.getDocuments = function (search, facets, existent) {
        var query = {
            query: self.query(search, facets),
            highlight: self.highlight()
        },
            from = 0;
        if (existent > 0) {
            from = existent;
        }
        
        return self.client().search({
            index: self.index,
            type: "reviews",
            size: size,
            from: from,
            body: query
        }).then(function (result) {
            var docs = result.hits.hits,
                total = result.hits.total;
            docs = docs.map(function (d) {
                var newD = d._source;
                newD.text = d.highlight["review.text"][0];
                newD.t1 = newD.text[newD.text.length - 1];
                newD.t2 = newD.review.text[newD.review.text.length - 1];
                newD.id = d._id;
                if (newD.text[newD.text.length - 1] !== newD.review.text[newD.review.text.length - 1]) {
                    newD.text = newD.text + "...";
                }
                
                return newD;
            });
            return {docs: docs, total: total};
        });
    };
    
    self.getFacets = function (search, facets, filter) {
        var query = {
                query: self.query(search, filter),
                aggs: {}
            },
            significant = false;
        
        if (query.query.query_string) {
            significant = true;
        }
        facets.forEach(function (f) {
            query.aggs[f.title] = self.agg(f.field, significant);
        });
        
        return self.client().search({
            index: self.index,
            type: "reviews",
            size: 0,
            body: query
        }).then(function (result) {
            var facs = [], chartField = 'doc_count';
            
            Object.keys(result.aggregations).forEach(function (k) {
                var max = d3.max(result.aggregations[k].buckets, function (b) {
                        return b[chartField];
                    }),
                    maxPercent = d3.max(result.aggregations[k].buckets, function (b) {
                        b.percent = b.doc_count / b.bg_count;
                        return b.percent;
                    }),
                    parent = facets.filter(function (f) {return f.title === k; })[0],
                    directive = parent.directive,
                    title = parent.title,
                    order = parent.order;
                
                if (k === "Rating") {
                    result.aggregations[k].buckets.sort(Utils.fieldSort("key"));
                }
                facs.push({facet: k, data: result.aggregations[k].buckets, others: result.aggregations[k].sum_other_doc_count, max: max, maxPercent: maxPercent, order: order, title: title, directive: directive});
            });
            return facs;
        });
                
        
    };
    
    self.getTerms = function (search, facets) {
        
        var query = {
            query: self.query(search, facets),
            aggs: {}
        },
            re = /(\w+)/g,
            
            exclude = search ? myStop.concat(search.match(re)) : myStop;
        
        query.aggs =  {
            "Terms": {
                "terms": {
                    "field": "review.text",
                    "size": 50,
                    "exclude": exclude.join("|")
                }
            },
            "Significant": {
                "significant_terms": {
                    "field": "review.text",
                    "size": 50,
                    "exclude": exclude.join("|")
                }
            }
        };

        if (query.query.query_string.query === "*") {
            console.log("inside");
            query.aggs.Significant = undefined;
        }
        
        return self.client().search({
            index: self.index,
            type: "reviews",
            size: 0,
            body: query
        }).then(function (result) {
            var r = {
                Significant: result.aggregations.Significant ? { max: d3.max(result.aggregations.Significant.buckets, function (d) {return d.doc_count; }), data: result.aggregations.Significant.buckets} : [],
                Terms: { max: d3.max(result.aggregations.Terms.buckets, function (d) {return d.doc_count; }), data: result.aggregations.Terms.buckets}
            };
            return r;
        });
    };
    return self;
});

























