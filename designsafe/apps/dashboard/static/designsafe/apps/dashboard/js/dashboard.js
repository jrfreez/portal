$(document).ready(function () {
  var data = [
    {date: new Date('2016-01-01T00:00:00'), count:4},
    {date: new Date('2016-01-02T00:00:00'), count:4},
    {date: new Date('2016-01-03T00:00:00'), count:3},
    {date: new Date('2016-01-04T00:00:00'), count:5},
    {date: new Date('2016-01-05T00:00:00'), count:2},
    {date: new Date('2016-01-06T00:00:00'), count:1},
    {date: new Date('2016-01-07T00:00:00'), count:1},
    {date: new Date('2016-01-08T00:00:00'), count:1},
    {date: new Date('2016-01-09T00:00:00'), count:2},
    {date: new Date('2016-01-10T00:00:00'), count:4},
    {date: new Date('2016-01-11T00:00:00'), count:5},
    {date: new Date('2016-01-12T00:00:00'), count:6},
    {date: new Date('2016-01-13T00:00:00'), count:2},
    {date: new Date('2016-01-14T00:00:00'), count:1},
  ];
  //9 $.getJSON()
  chart = DS_TSBarChart('#ds_jobs_chart')
          .height(250)
          .ySelector(function (d) { return d.count;})
          .xSelector(function (d) { return d.date;})
          .data(data);
});