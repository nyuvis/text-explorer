/*global Tex, d3, console, topojson*/
var facets = {
    rating: function (facet, data) {
        'use strict';
        var title, table, avg, tdsCount, tdsPercent,
            barWidth = 80,
            countScale = d3.scale.linear().range([0, barWidth]).domain([0, data.max]),
            percentScale = d3.scale.linear().range([0, barWidth]).domain([0, data.maxPercent]);
        
        
        function buildTable() {
            table = facet.board.append("table");
            var footer, header = table.append("tr"),
                lines = table.selectAll(".line").data(data.data)
                .enter()
                .append("tr")
                .attr("class", "line")
                .on("click", function (d) {
                    facet.onSelect(d, data);
                });
            header.append("th").text("");
            
            
            
            
            lines.append("td")
                .attr("class", "label")
                .text(function (d) {return d.key + (d.key === 1 ? " star" : " stars"); });
            
            if (data.maxPercent) {
                header.append("th").text("Proportion");
                tdsPercent = lines.append("td")
                    .attr("class", "bar");

                tdsPercent.append("div")
                        .attr("class", "barBase");


                tdsPercent.append("div")
                    .attr("class", "barValue")
                    .attr("title", function (d) {return (d.percent * 100).toFixed(2) + "%"; })
                    .style({
                        width: function (d) {return percentScale(d.percent) + 'px'; },
                        "background-color": function (d) { return facet.colors.percentDis(d.percent); }
                    });
            }
            header.append("th").text("Count");
            tdsCount = lines.append("td")
                .attr("class", "bar");
            
            tdsCount.append("div")
                    .attr("class", "barBase");
            
            tdsCount.append("div")
                .attr("class", "barValue")
                .attr("title", function (d) {return d.doc_count; })
                .style({
                    width: function (d) {return countScale(d.doc_count) + 'px'; },
                    "background-color": function (d) { return facet.colors.countDis(d.doc_count); }
                });
            
            lines.append("td")
                .attr("class", "value")
                .text(function (d) {return d.doc_count; });
            header.append("th").text("");
            footer = table.append("tr").attr("class", "footer");
            footer.append("td").text("");
            if (data.maxPercent) {
                footer.append("td").attr("class", "maxValue").text((data.maxPercent * 100).toFixed(3) + '%');
            }
            footer.append("td").attr("class", "maxValue").text(data.max);
            footer.append("td").text("");
        }
        
        facet.build = function () {
            var sum = 0, weightedSum = 0;
            data.data.forEach(function (d) {
                sum += d.doc_count;
                weightedSum += d.doc_count * d.key;
            });
            avg = weightedSum / sum;
            facet.title.append("span").text(" (Avg: " + avg.toFixed(1) + ")");
            buildTable();
        };
        
        
    },
    provider: function (facet, data) {
        'use strict';
        var title, table, avg, tdsCount, tdsPercent,
            barWidth = 30,
            countScale = d3.scale.sqrt().range([0, barWidth]).domain([0, data.max]),
            percentScale = d3.scale.sqrt().range([0, barWidth]).domain([0, data.maxPercent]);
        facet.colors.countDis = function (value) {
            if (value < 5) { return "#D2DBE0"; }
            if (value < 50) { return "#98AEB8"; }
            if (value < 500) { return "#607D8B"; }
            if (value < 5000) { return "#2D8FBE"; }
            return "#009EEB";
        };
        
        function buildTable() {
            table = facet.board.append("div").attr("class", "base").append("table");
            var footer, header = table.append("tr"),
                lines = table.selectAll(".line").data(data.data)
                .enter()
                .append("tr")
                .attr("class", "line")
                .on("click", function (d) {
                    facet.onSelect(d, data);
                });
            header.append("th").text("");
            
            lines.append("td")
                .attr("class", "label")
                .text(function (d) {return d.key; });
            
            if (data.maxPercent) {
                header.append("th").text("%");
                tdsPercent = lines.append("td")
                    .attr("class", "bar")
                    .attr("title", function (d) {return (d.percent * 100).toFixed(2) + "%"; });

                tdsPercent.append("div")
                    .attr("class", "barBase")
                    .append("div")
                    .attr("class", "barValue")
                    .attr("title", function (d) {return (d.percent * 100).toFixed(2) + "%"; })
                    .style({
                        left: function (d) {return (barWidth - percentScale(d.percent)) / 2 + 'px'; },
                        top: function (d) {return (barWidth - percentScale(d.percent)) / 2 + 'px'; },
                        height: function (d) {return percentScale(d.percent) + 'px'; },
                        width: function (d) {return percentScale(d.percent) + 'px'; },
                        "background-color": function (d) { return facet.colors.percentDis(d.percent); }
                    });
            }
            header.append("th").text("N");
            tdsCount = lines.append("td")
                .attr("class", "bar")
                .attr("title", function (d) {return d.doc_count; });
                
            tdsCount.append("div")
                .attr("class", "barBase")
                .append("div")
                .attr("class", "barValue")
                .attr("title", function (d) {return d.doc_count; })
                .style({
                    left: function (d) {return (barWidth - countScale(d.doc_count)) / 2 + 'px'; },
                    top: function (d) {return (barWidth - countScale(d.doc_count)) / 2 + 'px'; },
                    height: function (d) {return countScale(d.doc_count) + 'px'; },
                    width: function (d) {return countScale(d.doc_count) + 'px'; },
                    "background-color": function (d) { return facet.colors.countDis(d.doc_count); }
                });
        }
        
        facet.build = function () {
            facet.title.append("span").text("Max: Count: " + data.max + ", Percent: " + (data.maxPercent * 100).toFixed(2) + "%");
            buildTable();
        };
    },
    cloud: function (facet, data) {
        'use strict';
        
    }
          
};
        
Tex.directive("cloud", function () {
    'use strict';
    return {
        restrict: "A",
        template: '<div class="loading" ng-show="loading > 0">Loading...</div>',
        scope: {
            data: '=',
            loading: '=',
            search: '=',
            h: '='
        },
        link: function (scope, elem, attrs) {
            var board = d3.select(elem[0]),
                fill = d3.scale.category20(),
                score = d3.scale.linear();
            function draw(words) {
                board.selectAll("svg").remove();
                board.append("svg")
                    .attr("width", 250)
                    .attr("height", scope.h)
                    .append("g")
                    .attr("transform", "translate(125," + (scope.h / 2) + ")")
                    .selectAll("text")
                    .data(words)
                    .enter().append("text")
                    .style("font-size", function (d) { return d.size + "px"; })
                    .style("fill", function (d, i) {return score(d.score); })
                    .style("cursor", "pointer")
                    .attr("text-anchor", "middle")
                    .attr("transform", function (d) {
                        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                    })
                    .text(function (d) { return d.text; })
                    .on("click", function (d) {
                        var t = d.text;
                        if (d.text.indexOf(" ") > -1) {
                            t = '"' + t + '"';
                        }
                        scope.$parent.appendWord(t);
                        
                    });
            }
            scope.$watch(function () { return scope.data; }, function () {
                if (scope.data) {
                    var size = d3.scale.linear().range([10, 35]).domain([0, scope.data.max]);
                    score = d3.scale.linear().range(["#9aafb9", "#FF5722"]).domain([d3.min(scope.data.data, function (d) {return d.score; }), d3.max(scope.data.data, function (d) {return d.score; })]);
                    d3.layout.cloud().size([250, scope.h])
                        .words(scope.data.data.map(function (d) {return {text: d.key, size: d.doc_count, score: d.score}; }))
                            .padding(5)
                            .rotate(function () { return 0; })
                            .fontSize(function (d) { return size(d.size); })
                            .on("end", draw)
                            .start();
                }
            });
        }
    };
});


Tex.directive("facet", function () {
    'use strict';
    return {
        restrict: "A",
        template: '<h1>{{data.facet}}</h1><div class="loading" ng-show="loading > 0">Loading...</div>',
        scope: {
            data: '=',
            loading: '='
        },
        link: function (scope, elem, attrs) {
            var facet = {
                    board: d3.select(elem[0]),
                    title: d3.select(elem[0]).select("h1"),
                    colors: {
                        percentDis: function (value) {
                            if (value < 0.001) { return "#D2DBE0"; }
                            if (value < 0.01) { return "#98AEB8"; }
                            if (value < 0.1) { return "#607D8B"; }
                            if (value < 0.5) { return "#2D8FBE"; }
                            return "#009EEB";
                        },
                        countDis: function (value) {
                            if (value < 100) { return "#D2DBE0"; }
                            if (value < 1000) { return "#98AEB8"; }
                            if (value < 10000) { return "#607D8B"; }
                            if (value < 100000) { return "#2D8FBE"; }
                            return "#009EEB";
                        }
                    },
                    build: function () {
                        facet.board.append('div').text('todo');
                    },
                    onSelect: function (d, facet) {
                        scope.$parent.$parent.addFacetFilter(d, facet);
                    }
                };
            if (facets[scope.data.directive]) {
                facets[scope.data.directive](facet, scope.data);
            }
            
            facet.build();
        }
    };
});


