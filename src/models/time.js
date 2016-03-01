import * as utils from 'base/utils';
import Model from 'base/model';

/*!
 * VIZABI Time Model
 */

// short-cut for developers to get UTC date strings
// not meant to be used in code!!!
Date.prototype.utc = Date.prototype.toUTCString;

/*
 * Time formats for internal data
 * all in UTC
 */
var formats = {
  'year':    d3.time.format.utc('%Y'),
  'month':   d3.time.format.utc('%Y%m'),
  'day':     d3.time.format.utc('%Y%m%d'),
  'hour':    d3.time.format.utc("%Y-%m-%d %H"),
  'minute':  d3.time.format.utc("%Y-%m-%d %H:%M"),
  'second':  d3.time.format.utc("%Y-%m-%d %H:%M:%S"),
  'week':    weekFormat(),   // %Yw%W d3 week format does not comply with ISO
  'quarter': quarterFormat() // %Yq%Q d3 does not support quarters
};

var TimeModel = Model.extend({

  /**
   * Default values for this model
   */
  _defaults: {
    dim: "time",
    value: "2015",
    start: "1800",
    end: "2015",
    playable: true,
    playing: false,
    loop: false,
    round: 'round',
    delay: 300,
    delayStart: 1200,
    delayEnd: 75,
    delayThresholdX2: 300,
    delayThresholdX4: 150,
    delaySet: false,
    unit: "year",
    step: 1, //step must be integer
    adaptMinMaxZoom: false, //TODO: remove from here. only for bubble chart
    xLogStops: [], //TODO: remove from here. only for mountain chart
    yMaxMethod: "latest", //TODO: remove from here. only for mountain chart
    record: false,
    probeX: 0, //TODO: remove from here. only for mountain chart
    tailFatX: 1, //TODO: remove from here. only for mountain chart
    tailCutX: 0, //TODO: remove from here. only for mountain chart
    tailFade: 1, //TODO: remove from here. only for mountain chart
    xScaleFactor: 1, //TODO: remove from here. only for mountain chart
    xScaleShift: 0, //TODO: remove from here. only for mountain chart
    xPoints: 50 //TODO: remove from here. only for mountain chart
  },

  /**
   * Initializes the language model.
   * @param {Object} values The initial values of this model
   * @param parent A reference to the parent model
   * @param {Object} bind Initial events to bind
   */
  init: function(name, values, parent, bind) {

    this._type = "time";
    //default values for time model
    var defaults = utils.deepClone(this._defaults);
    values = utils.extend(defaults, values);

    //same constructor
    this._super(name, values, parent, bind);

    var _this = this;
    this.timeFormat = formats[this.unit];
    this.dragging = false;
    this.postponePause = false;
    this.allSteps = {};
    this.delayAnimations = this.delay;

    //bing play method to model change
    this.on({

      "change:playing": function() {
        if(_this.playing === true) {
          _this._startPlaying();
        } else {
          _this._stopPlaying();
        }
      },

      "change:unit": function() {
        _this.timeFormat = formats[_this.unit];
      }

    });
  },

  /**
   * Formats value, start and end dates to actual Date objects
   */
  _formatToDates: function() {

    var date_attr = ["value", "start", "end"];
    for(var i = 0; i < date_attr.length; i++) {
      var attr = date_attr[i];
      if(!utils.isDate(this[attr])) {
        var date = this.parseToUnit(this[attr].toString(), this.unit);
        this.set(attr, date);
      }
    }
  },

  /*
   * Formatting and parsing functions
   * @param {Date} date
   * @param {String} unit
   * @returns {String}
   */
  format: function(dateObject, unit) {
    unit = unit || this.unit;
    return formats[unit] ? formats[unit](dateObject) : formats['year'](dateObject);
  },

  parseToUnit: function(timeString, unit) {
    unit = unit || this.unit;
    return formats[unit] ? formats[unit].parse(timeString) : null;
  },

  parse: function(timeString) {
    var keys = Object.keys(formats), i = 0;
    for (; i < keys.length; i++) {
      var dateObject = formats[keys[i]].parse(timeString);
      if (date) return { unit: keys[i], time: dateObject };
    }
    return null;
  },


  /**
   * Validates the model
   */
  validate: function() {

    //unit has to be one of the available_time_units
    if(!formats[this.unit]) {
      utils.warn(this.unit + ' is not a valid time unit, using "year" instead.');
      this.unit = "year";
    }

    if(this.step < 1) {
      this.step = 1;
    }

    //make sure dates are transformed into dates at all times
    if(!utils.isDate(this.start) || !utils.isDate(this.end) || !utils.isDate(this.value)) {
      this._formatToDates();
    }

    //end has to be >= than start
    if(this.end < this.start) {
      this.end = new Date(this.start);
    }
    //value has to be between start and end
    if(this.value < this.start) {
      this.value = new Date(this.start);
    } else if(this.value > this.end) {
      this.value = new Date(this.end);
    }

    if(this.playable === false && this.playing === true) {
      this.playing = false;
    }
    if(this.round) {
      var is = this.getIntervalAndStep();
      this.value = d3.time[is.interval].utc[this.round](this.value);
    }

  },

  /**
   * Plays time
   */
  play: function() {
    this._startPlaying();
  },

  /**
   * Pauses time
   */
  pause: function(soft) {
    if(soft) {
      this.postponePause = true;
    } else {
      this.playing = false;
    }
  },

  /**
   * Indicates dragging of time
   */
  dragStart: function() {
    this.dragging = true;
  },
  dragStop: function() {
    this.dragging = false;
  },


  /**
   * gets time range
   * @returns range between start and end
   */
  getRange: function() {
    var is = this.getIntervalAndStep();
    return d3.time[is.interval].utc.range(this.start, this.end, is.step);
  },

  /**
   * gets the d3 interval and stepsize for d3 time interval methods
   * D3's week-interval starts on sunday and it does not support a quarter interval
   *
   **/
  getIntervalAndStep: function() {
    var d3Interval, step;
    switch (this.unit) {
      case 'week': d3Interval = 'monday'; step = this.step; break;
      case 'quarter': d3Interval = 'month'; step = this.step*3; break;
      default: d3Interval = this.unit; step = this.step; break;
    }
    return { interval: d3Interval, step: step };
  },

  /**
   * Gets filter for time
   * @param {Boolean} firstScreen get filter for current year only
   * @returns {Object} time filter
   */
  getFilter: function(firstScreen) {
    var start = this.timeFormat(this.start);
    var end = this.timeFormat(this.end);
    var value = this.timeFormat(this.value);
    var dim = this.getDimension();
    var filter = {};

    filter[dim] = (firstScreen) ? [
      [value]
    ] : [
      [start, end]
    ];
    return filter;
  },

  /**
   * Gets formatter for this model
   * @returns {Function} formatter function
   */
  getParser: function() {
    return this.timeFormat.parse;
  },

  /**
   * Gets an array with all time steps for this model
   * @returns {Array} time array
   */
  getAllSteps: function() {
    var hash = "" + this.start + this.end + this.step;

    //return if cached
    if(this.allSteps[hash]) return this.allSteps[hash];

    this.allSteps[hash] = [];
    var curr = this.start;
    while(curr <= this.end) {
      var is = this.getIntervalAndStep();
      this.allSteps[hash].push(curr.toString());
      curr = d3.time[is.interval].utc.offset(curr, is.step);
    }
    return this.allSteps[hash];
  },

  /**
   * Snaps the time to integer
   * possible inputs are "start", "end", "value". "value" is default
   */
  snap: function(what) {
    if(!this.round) return;
    if(what == null) what = "value";
    var op = 'round';
    if(this.round === 'ceil') op = 'ceil';
    if(this.round === 'floor') op = 'floor';
    var is = this.getIntervalAndStep();
    var time = d3.time[is.interval].utc[op](this[what]);
    this.set(what, time, true); //3rd argumennt forces update
  },

  /**
   * Starts playing the time, initializing the interval
   */
  _startPlaying: function() {
    //don't play if it's not playable
    if(!this.playable) return;

    var _this = this;

    //go to start if we start from end point
    if(this.value >= this.end) {
      _this.getModelObject('value').set(_this.start, null, false /*make change non-persistent for URL and history*/);
    } else {
      //the assumption is that the time is already snapped when we start playing
      //because only dragging the timeslider can un-snap the time, and it snaps on drag.end
      //so we don't need this line. let's see if we survive without.
      //as a consequence, the first time update in playing sequence will have this.playing flag up
      //so the bubble chart will zoom in smoothly. Closes #1213
      //this.snap();
    }
    this.playing = true;
    this.playInterval();

    this.trigger("play");
  },

  playInterval: function(){
    if(!this.playing) return;
    var _this = this;
    this.delayAnimations = this.delay;
    if(this.delay < this.delayThresholdX2) this.delayAnimations*=2;
    if(this.delay < this.delayThresholdX4) this.delayAnimations*=2;

    this._intervals.setInterval('playInterval_' + this._id, function() {
      // when time is playing and it reached the end
      if(_this.value >= _this.end) {
        // if looping
        if(_this.loop) {
          // reset time to start, silently
          _this.getModelObject('value').set(_this.start, null, false /*make change non-persistent for URL and history*/);
        } else {
          _this.playing = false;
        }
        return;
      } else {

        _this._intervals.clearInterval('playInterval_' + _this._id);

        if(_this.postponePause || !_this.playing) {
          _this.playing = false;
          _this.postponePause = false;
          _this.getModelObject('value').set(_this.value, true, true /*force the change and make it persistent for URL and history*/);
        } else {
          var is = _this.getIntervalAndStep();
          if(_this.delay < _this.delayThresholdX2) is.step*=2;
          if(_this.delay < _this.delayThresholdX4) is.step*=2;
          var time = d3.time[is.interval].utc.offset(_this.value, is.step);
          if(time >= _this.end) {
            // if no playing needed anymore then make the last update persistent and not overshooting
            _this.getModelObject('value').set(_this.end, null, true /*force the change and make it persistent for URL and history*/);
          }else{
            _this.getModelObject('value').set(time, null, false /*make change non-persistent for URL and history*/);
          }
          _this.playInterval();
        }
      }
    }, this.delayAnimations);

  },

  /**
   * Stops playing the time, clearing the interval
   */
  _stopPlaying: function() {
    this._intervals.clearInterval('playInterval_' + this._id);
    //this.snap();
    this.trigger("pause");
  }

});

/*
 * Week Format to format and parse dates
 * Conforms with ISO8601
 * Follows format: YYYYwWW: 2015w04, 3845w34, 0020w53
 */
function weekFormat() {

  var format = function(d) {
    return formatWeekYear(d) + 'w' + formatWeek(d);
  }

  format.parse = function parse(dateString) {
    var matchedDate = dateString.match(/^(\d{4})w(\d{2})$/);
    return matchedDate ? getDateFromWeek(matchedDate[1], matchedDate[2]): null;
  };

  var formatWeekYear = function(d) {
      var origin = +d;
      return new Date(origin + ((4 - (d.getUTCDay() || 7)) * 86400000)).getUTCFullYear();
  };

  var formatWeek = function(d) {
    var origin = +d;
    var quote = new Date(origin + ((4 - (d.getUTCDay() || 7)) * 86400000))
    var week = Math.ceil(((quote.getTime() - quote.setUTCMonth(0, 1)) / 86400000 + 1) / 7);
    return week < 10 ? '0' + week : week;
  };

  var getDateFromWeek = function(p1, p2) {
    var week = parseInt(p2);
    var year = p1;
    var startDateOfYear = new Date(); // always 4th of January (according to standard ISO 8601)
    startDateOfYear.setUTCFullYear(year);
    startDateOfYear.setUTCMonth(0);
    startDateOfYear.setUTCDate(4);
    var startDayOfWeek = startDateOfYear.getUTCDay() || 7;
    var dayOfWeek = 1; // Monday === 1
    var dayOfYear = week * 7 + dayOfWeek - (startDayOfWeek + 4);

    var date = formats['year'].parse(year);
    date = new Date(date.getTime() + dayOfYear * 24 * 60 * 60 * 1000);

    return date;
  }

  return format;

};

/*
 * Quarter Format to format and parse quarter dates
 * A quarter is the month%3
 * Follows format: YYYYqQ: 2015q4, 5847q1, 0040q2
 */
function quarterFormat() {

  var format = function(d) {
    return formats['year'](d) + 'q' + formatQuarter(d)
  }

  format.parse = function(dateString) {
    var matchedDate = dateString.match(/^(\d{4})q(\d)$/);
    return matchedDate ? getDateFromQuarter(matchedDate[1], matchedDate[2]): null;
  }

  var formatQuarter = function(d) {
    return ((d.getUTCMonth() / 3) | 0) + 1;
  };

  var getDateFromQuarter = function(p1, p2) {
    var quarter = parseInt(p2);
    var month = 3 * quarter - 2; // first month in quarter
    var year = p1;
    return formats['month'].parse([year, (month < 9 ? '0': '') + month].join(''));
  }

  return format;
}

export default TimeModel;
