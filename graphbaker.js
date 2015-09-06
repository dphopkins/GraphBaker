// API.AI ACCESS

var accessToken = "a84613a3a28c4078bc525d8c44b2d49d";
var subscriptionKey = "3e97c4e5-d365-4210-b0bf-d6ef014daed3";
var baseUrl = "https://api.api.ai/v1/";

// initial size of pie
window.total = 0;

// initial pie has this data:
window.initData = [{"label":"", "value":100}];

$(document).keypress(function(e) {
    if (e.which == 13) {
        $("#input").val("");
    }
});

$(document).ready(function() {
    $("#input").keypress(function(event) {
        if (event.which == 13) {
            event.preventDefault();
            send();
        }
    });
    $("#rec").click(function(event) {
        switchRecognition();
    });
});

var recognition;

function startRecognition() {
    recognition = new webkitSpeechRecognition();
    recognition.onstart = function(event) {
        updateRec();
    };
    recognition.onresult = function(event) {
        var text = "";
        for (var i = event.resultIndex; i < event.results.length; ++i) {
            text += event.results[i][0].transcript;
        }
        setInput(text);
        stopRecognition();
    };
    recognition.onend = function() {
        stopRecognition();
    };
    recognition.lang = "en-US";
    recognition.start();
}

function stopRecognition() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
    updateRec();
}

function switchRecognition() {
    if (recognition) {
        stopRecognition();
    } else {
        startRecognition();
    }
}

function setInput(text) {
    $("#input").val(text);
    send();
}

function updateRec() {
    $("#rec").text(recognition ? "Stop" : "Speak");
}

function send() {
    var text = $("#input").val();
    $.ajax({
        type: "POST",
        url: baseUrl + "query/",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + accessToken,
            "ocp-apim-subscription-key": subscriptionKey
        },
        data: JSON.stringify({ q: text, lang: "en" }),

        success: function(data) {
            var myJSON = JSON.stringify(data, undefined, 2);
            setResponse(myJSON);
            var parseJSON = eval("(function(){return " + myJSON + ";})()");
            var instruction = parseJSON.result.speech;
            var action = parseJSON.result.action + "()";
            var paramJSON = parseJSON.result.parameters;

            var parameters;
            for (var param in paramJSON) {
                if (paramJSON.hasOwnProperty(param)) {
                    parameters = param + ': ' + paramJSON[param];
                    // param = chartType
                    // parameters[param] = pie
                }
            }

            setFulfillment(parseJSON.result.speech + "\n\n" + action + "\n\n" + parameters);

            // ORDER PIE HERE
            switch(action) {
                case "makePie()":
                    makePie(window.initData);
                    break;
                case "setTitle()":
                    var title = parameters.split(": ")[1];
                    // setTitle(title);
                    break;
                case "nameSlice()":
                    var sliceName = parameters.split(": ")[1];                   
                    window.initData.push({"label": sliceName, "value": 0}); // add the new section with 0 are
                    break;
                case "sizeSlice()":
                    var sliceSize = parameters.split(": ")[1];
                    window.total += sliceSize;

                    if (window.total > 100) {
                        alert("Too much pie!");
                        // no recovery atm
                        // just max out the last one

                    } else if (window.total == 100) {
                        var oldData = window.initData.pop(); // the now-useless entry in initData (label: sliceName, value: 0)
                        window.initData[0]["label"] = sliceName; // might not be in scope
                        window.initData[0]["value"] = sliceSize;

                        eatPie();
                        makePie(window.initData);
                        stop();
                    } else {
                        window.initData[0]["value"] -= sliceSize;
                        window.initData.slice(-1)[0]["value"] = sliceSize; // sets last value in array

                        eatPie();
                        makePie(window.initData);
                    }

                    break;
                case "stop()":
                    stop();
                    break;
            }
        },
        error: function() {
            setResponse("Internal Server Error");
        }
    });
    setResponse("Loading...");
}

function setResponse(val) {
    // $("#response").text(val);
}

function setFulfillment(val) {
    $("#fulfillment").text(val);
}


// THE BAKERY

// data = [{"label":"one", "value":20}, 
//         {"label":"two", "value":50}, 
//         {"label":"three", "value":30}];

function makePie(data) {
    var w = 500,                        //width
    h = 500,                            //height
    r = 250,                            //radius
    color = d3.scale.category20c();     //builtin range of colors

    var vis = d3.select("body")
        .append("svg:svg")              //create the SVG element inside the <body>
        .data([data])                   //associate our data with the document
            .attr("width", w)           //set the width and height of our visualization (these will be attributes of the <svg> tag
            .attr("height", h)
        .append("svg:g")                //make a group to hold our pie chart
            .attr("transform", "translate(" + r + "," + r + ")")    //move the center of the pie chart from 0, 0 to radius, radius

    var arc = d3.svg.arc()              //this will create <path> elements for us using arc data
        .outerRadius(r);

    var pie = d3.layout.pie()           //this will create arc data for us given a list of values
        .value(function(d) { return d.value; });    //we must tell it out to access the value of each element in our data array

    var arcs = vis.selectAll("g.slice")     //this selects all <g> elements with class slice (there aren't any yet)
        .data(pie)                          //associate the generated pie data (an array of arcs, each having startAngle, endAngle and value properties) 
        .enter()                            //this will create <g> elements for every "extra" data element that should be associated with a selection. The result is creating a <g> for every object in the data array
            .append("svg:g")                //create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
                .attr("class", "slice");    //allow us to style things in the slices (like text)

        arcs.append("svg:path")
                .attr("fill", function(d, i) { return color(i); } ) //set the color for each slice to be chosen from the color function defined above
                .attr("d", arc);                                    //this creates the actual SVG path using the associated data (pie) with the arc drawing function

        arcs.append("svg:text")                                     //add a label to each slice
                .attr("transform", function(d) {                    //set the label's origin to the center of the arc
                //we have to make sure to set these before calling arc.centroid
                d.innerRadius = 0;
                d.outerRadius = r;
                return "translate(" + arc.centroid(d) + ")";        //this gives us a pair of coordinates like [50, 50]
            })
            .attr("text-anchor", "middle")                          //center the text on it's origin
            .text(function(d, i) { return data[i].label; });        //get the label from our original data array
}

function eatPie() { // erases the current pie
    d3.select("svg")
        .remove();
}

function stop() {
    // send "stop" as input
    // disable input
}