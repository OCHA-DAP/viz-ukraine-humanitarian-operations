window.$ = window.jQuery = require('jquery');
var bbox = require('@turf/bbox');
var turfHelpers = require('@turf/helpers');
var format = require('date-fns/format');
/******************/
/*** SPARKLINES ***/
/******************/
function createSparkline(data, div, size) {
  var width = (isMobile) ? 30 : 60;
  var height = 20;
  var x = d3.scaleLinear().range([0, width]);
  var y = d3.scaleLinear().range([height, 0]);
  var parseDate = d3.timeParse("%Y-%m-%d");
  var line = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.value); })
    .curve(d3.curveBasis);

  data.forEach(function(d) {
    d.date = parseDate(d.date);
    d.value = +d.value;
  });

  x.domain(d3.extent(data, function(d) { return d.date; }));
  y.domain(d3.extent(data, function(d) { return d.value; }));

  var svg = d3.select(div)
    .append('svg')
    .attr('class', 'sparkline')
    .attr('width', width)
    .attr('height', height+5)
    .append('g')
      .attr('transform', 'translate(0,4)');
    
  svg.append('path')
   .datum(data)
   .attr('class', 'sparkline')
   .attr('d', line);
}


/****************************************/
/*** TIMESERIES CHART FUNCTIONS ***/
/****************************************/
function initTimeseries(data, div) {
  let formattedData = formatData(data);
  $('.trendseries-title').html('<h6>Total Number of Conflict Events</h6><div class="num">'+numFormat(data.length)+'</div>');
  createTimeSeries(formattedData, div);
}

let eventsArray;
function formatData(data) {
  let events = d3.nest()
    .key(function(d) { return d['#date+occurred']; })
    .key(function(d) { return d['#event+type']; })
    .rollup(function(leaves) { return leaves.length; })
    .entries(data);

  let dates = [... new Set(acledData.map((d) => d['#date+occurred']))];
  let totals = [];

  eventsArray = [];
  dates.forEach(function(date, index) {
    totals[index] = 0;
    eventsArray[date] = [];
    events.forEach(function(event) {
      let val = 0;
      event.values.forEach(function (v) {
        val += v.value;
      });

      if (event.key==date) {
        totals[index] = (totals[index]==undefined) ? val : totals[index]+val; //save aggregate of all events per day
        eventsArray[event.key] = event.values; //save event breakdown by date
      }
    });
  })

  //format for c3
  dates.unshift('x');
  totals.unshift('All');
  return {series: [dates, totals], events: eventsArray};
}


function createTimeSeries(data, div) {
  const chartWidth = viewportWidth - $('.country-panel').width() - 100;
  const chartHeight = 280;
  let colorArray = ['#F8B1AD'];

  var chart = c3.generate({
    size: {
      width: chartWidth,
      height: chartHeight
    },
    padding: {
      bottom: (isMobile) ? 60 : 0,
      top: 10,
      left: (isMobile) ? 30 : 35,
      right: (isMobile) ? 200 : 200
    },
    bindto: div,
    data: {
      x: 'x',
      columns: data.series
    },
    color: {
      pattern: colorArray
    },
    point: { show: false },
    grid: {
      y: {
        show: true
      }
    },
    axis: {
      x: {
        type: 'timeseries',
        tick: { 
          format: function (x) { 
            return (x.getMonth()+1) + '/' + x.getDate() + '/' + x.getFullYear(); 
          },
          outer: false
        }
      },
      y: {
        min: 0,
        padding: { 
          top: (isMobile) ? 20 : 50, 
          bottom: 0 
        },
        tick: { 
          outer: false,
          format: function(d) {
            if (Math.floor(d) != d){
              return;
            }
            return d;
          }
        }
      }
    },
    legend: {
      show: false
    },
    transition: { duration: 500 },
    tooltip: {
      contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
        let date = new Date(d[0].x);
        let dateID = format(date, 'yyyy-MM-dd');
        let events = eventsArray[dateID];
        let total = d[0].value;
        let html = `<table><thead><tr><th colspan="2">${format(date, 'MMM d, yyyy')}</th></tr><thead>`;
        for (var i=0; i<=events.length-1; i++) {
          html += `<tr><td>${events[i].key}</td><td>${events[i].value}</td></tr>`;
        };
        html += `<tr><td><b>Total</b></td><td><b>${total}</b></td></tr></table>`;
        return html;
      }
    }
  });

  countryTimeseriesChart = chart;
  createSource($('#chart-view .source-container'), '#date+latest+acled');
}


function updateTimeseries(selected) {
  let filteredData = (selected!='All') ? acledData.filter((d) => d['#adm1+code'] == selected) : acledData;
  let data = formatData(filteredData);
  eventsArray = data.events;

  $('.trendseries-title').find('.num').html(numFormat(filteredData.length));

  if (filteredData.length<=0)
    $('.trendseries-chart').hide();
  else 
    $('.trendseries-chart').show();

  countryTimeseriesChart.load({
    columns: data.series
  });
}


/***************************/
/*** PIE CHART FUNCTIONS ***/
/***************************/
function createPieChart(data, div) {
  let requirement = data[0];
  let funded = data[1];
  let fundedPercent = funded/requirement;

  let width = (isMobile) ? 25 : 30
      height = width
      margin = 1

  let radius = Math.min(width, height)/2 - margin

  let svg = d3.select(div)
    .append('svg')
      .attr('class', 'pie-chart')
      .attr('width', width)
      .attr('height', height)
    .append('g')
      .attr('transform', `translate(${width/2}, ${height/2})`);

  let dataArray = {a: fundedPercent, b: 1-fundedPercent};

  let color = d3.scaleOrdinal()
    .domain(data)
    .range(['#418FDE', '#DFDFDF'])

  let pie = d3.pie()
    .value(function(d) { return d.value; }).sort(null);
  let formatData = pie(d3.entries(dataArray));

  svg
    .selectAll('g')
    .data(formatData)
    .enter()
    .append('path')
    .attr('d', d3.arc()
      .innerRadius(0)
      .outerRadius(radius)
    )
    .attr('fill', function(d){ return( color(d.data.key)) })
    .style('stroke-width', 0)
}



function vizTrack(view, content) {
  mpTrack(view, content);
  gaTrack('viz interaction hdx', 'switch viz', 'ukr data explorer', content);
}

function mpTrack(view, content) {
  //mixpanel event
  mixpanel.track('viz interaction', {
    'page title': document.title,
    'embedded in': window.location.href,
    'action': 'switch viz',
    'viz type': 'ukr data explorer',
    'current view': view,
    'content': content
  });
}

function gaTrack(eventCategory, eventAction, eventLabel, type) {
  dataLayer.push({
    'event': eventCategory,
    'label': eventAction,
    'type': eventLabel
  });
}


function truncateString(str, num) {
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + '...';
}


function formatValue(val) {
  var format = d3.format('$.3s');
  var value;
  if (!isVal(val)) {
    value = 'NA';
  }
  else {
    value = (isNaN(val) || val==0) ? val : format(val).replace(/G/, 'B');
  }
  return value;
}

function oneDecNumFormat(num) {
  let val = (num.length>=8) ? d3.format('.3s')(num) : d3.format('.2s')(num);
  return val;
}

function roundUp(x, limit) {
  return Math.ceil(x/limit)*limit;
}


function isVal(value) {
  return (value===undefined || value===null || value==='') ? false : true;
}

function randomNumber(min, max) { 
  return Math.random() * (max - min) + min;
}

function createFootnote(target, indicator, text) {
  var indicatorName = (indicator==undefined) ? '' : indicator;
  var className = (indicatorName=='') ? 'footnote' : 'footnote footnote-indicator';
  var footnote = $(`<p class='${className}' data-indicator='${indicatorName}'>${truncateString(text, 65)}<a href='#' class='expand'>MORE</a></p>`);
  $(target).append(footnote);
  footnote.click(function() {
    if ($(this).find('a').hasClass('collapse')) {
      $(this).html(`${truncateString(text, 65)}<a href='#' class='expand'>MORE</a>`);
    }
    else {
      $(this).html(`${text}<a href='#' class='collapse'>LESS</a>`);
    }
  });
}


function getCurvedLine(start, end) {
  const radius = turf.rhumbDistance(start, end);
  const midpoint = turf.midpoint(start, end);
  const bearing = turf.rhumbBearing(start, end) - 89; // <-- not 90˚
  const origin = turf.rhumbDestination(midpoint, radius, bearing);

  const curvedLine = turf.lineArc(
    origin,
    turf.distance(origin, start),
    turf.bearing(origin, end),
    turf.bearing(origin, start),
    { steps: 128 }
  );

  return { line: curvedLine, bearing: bearing };
}


//country codes and raster ids
const countryCodeList = {
  UKR: '5rg490nv'
};


var map, mapFeatures, globalLayer, globalLabelLayer, globalMarkerLayer, countryLayer, countryBoundaryLayer, countryLabelLayer, countryMarkerLayer, tooltip, markerScale, countryMarkerScale;
var adm0SourceLayer = 'polbnda_int_uncs-6zgtye';
var hoveredStateId = null;
function initMap() {
  console.log('Loading map...')
  map = new mapboxgl.Map({
    container: 'global-map',
    style: 'mapbox://styles/humdata/cl0cqcpm4002014utgdbhcn4q',
    center: [-25, 0],
    minZoom: minZoom,
    zoom: zoomLevel,
    attributionControl: false
  });

  map.addControl(new mapboxgl.NavigationControl({showCompass: false}))
     .addControl(new mapboxgl.AttributionControl(), 'bottom-right');

  map.on('load', function() {
    console.log('Map loaded')
    
    mapLoaded = true;
    if (dataLoaded==true) displayMap();
  });
}

function displayMap() {
  console.log('Display map');

  //remove loader and show vis
  $('.loader, #static-map').remove();
  $('#global-map, .map-legend').css('opacity', 1);

  //init element events
  createEvents();

  //get layers
  map.getStyle().layers.map(function (layer) {
    switch(layer.id) {
      // case 'adm0-fills':
      //   globalLayer = layer.id;

      //   map.setFeatureState(
      //     { source: 'composite', sourceLayer: adm0SourceLayer, id: globalLayer },
      //     { hover: false }
      //   );
      //   break;
      case 'adm0-label':
        globalLabelLayer = layer.id;
        map.setLayoutProperty(globalLabelLayer, 'visibility', 'none');
        break;
      case 'adm0-centroids':
        globalMarkerLayer = layer.id;
        map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
        break;
      case 'adm1-fills':
        countryLayer = layer.id;
        map.setLayoutProperty(countryLayer, 'visibility', 'none');
        break;
      case 'adm1-label':
        countryLabelLayer = layer.id;
        map.setLayoutProperty(countryLabelLayer, 'visibility', 'none');
        break;
      case 'adm1-marker-points':
        countryMarkerLayer = layer.id;
        map.setLayoutProperty(countryMarkerLayer, 'visibility', 'none');
        break;
      case 'adm1-boundaries':
        countryBoundaryLayer = layer.id;
        map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'none');
        break;
      default:
        //do nothing
    }
  });

  mapFeatures = map.queryRenderedFeatures();

  //load pop density rasters
  var countryList = Object.keys(countryCodeList);
  countryList.forEach(function(country_code) {
    var id = country_code.toLowerCase();
    var raster = countryCodeList[country_code];
    if (raster!='') {
      map.addSource(id+'-pop-tileset', {
        type: 'raster',
        url: 'mapbox://humdata.'+raster
      });

      map.addLayer(
        {
          id: id+'-popdensity',
          type: 'raster',
          source: {
            type: 'raster',
            tiles: ['https://api.mapbox.com/v4/humdata.'+raster+'/{z}/{x}/{y}.png?access_token='+mapboxgl.accessToken],
          }
        },
        countryBoundaryLayer
      );

      map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
    }
  });

  initCountryLayer();

  //deeplink to country if parameter exists
  if (viewInitialized==true) deepLinkView();

  //create tooltip
  tooltip = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'map-tooltip'
  });
}

function deepLinkView() {
  let countryCode = 'UKR';
  if (countryCodeList.hasOwnProperty(countryCode)) {
    currentCountry.code = countryCode;
    currentCountry.name = 'Ukraine';

    //find matched features and zoom to country
    let selectedFeatures = matchMapFeatures(currentCountry.code);
    selectCountry(selectedFeatures);
  }

  //deep link to specific layer 
  let location = window.location.search;
  if (location.indexOf('?layer=')>-1) {
    let param = location.split('layer=')[1];
    let layer = $('.map-legend.country').find('input[data-layer="'+param+'"]');
    selectLayer(layer);
  }

  //deep link to tabbed view
  if (location.indexOf('?tab=')>-1) {
    let view = location.split('tab=')[1];
    let selectedTab = $(`.tab-menubar .tab-button[data-id="${view}"]`);
    selectedTab.click();
  }
}

function selectLayer(layer) {
  layer.prop('checked', true);
  currentCountryIndicator = {id: layer.val(), name: layer.parent().text()};
  updateCountryLayer();
  vizTrack(`main ${currentCountry.code} view`, currentCountryIndicator.name);

  //reset any deep links
  let layerID = layer.attr('data-layer');
  let location = (layerID==undefined) ? window.location.pathname : window.location.pathname+'?layer='+layerID;
  window.history.replaceState(null, null, location);
}

function matchMapFeatures(country_code) {
  //loop through mapFeatures to find matches to currentCountry.code
  var selectedFeatures = [];
  mapFeatures.forEach(function(feature) {
    if (feature.sourceLayer==adm0SourceLayer && feature.properties.ISO_3==currentCountry.code) {
      selectedFeatures.push(feature)
    }
  });
  return selectedFeatures;
}

function createEvents() {
  //country legend radio events
  $('input[type="radio"]').click(function(){
    var selected = $('input[name="countryIndicators"]:checked');
    selectLayer(selected);
  });

  //chart view trendseries select event
  d3.select('.trendseries-select').on('change',function(e) {
    var selected = d3.select('.trendseries-select').node().value;
    updateTimeseries(selected);
    if (currentCountry.code!==undefined && selected!==undefined)
      vizTrack(`chart ${currentCountry.code} view`, selected);
  });
}

function selectCountry(features) {
  //set first country indicator
  $('#affected+idps').prop('checked', true);
  currentCountryIndicator = {
    id: $('input[name="countryIndicators"]:checked').val(), 
    name: $('input[name="countryIndicators"]:checked').parent().text()
  };

  //reset panel
  $('.panel-content').animate({scrollTop: 0}, 300);

  updateCountryLayer();
  // map.setLayoutProperty(globalLayer, 'visibility', 'none');
  // map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
  //map.setLayoutProperty(countryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryMarkerLayer, 'visibility', 'visible');

  let target = bbox.default(turfHelpers.featureCollection(features));
  let mapPadding = (isMobile) ?
    {
        right: -100,
        left: -200,
        bottom: 0
    } :
    { 
      right: $('.map-legend.country').outerWidth()+65,
      left: $('.country-panel').outerWidth()-80,
      bottom: 50
    };
  map.fitBounds(regionBoundaryData[0].bbox, {
    offset: [0, -25] ,
    padding: {right: mapPadding.right, bottom: mapPadding.bottom, left: mapPadding.left},
    linear: true
  });

  map.once('moveend', initCountryView);
}


/*****************************/
/*** COUNTRY MAP FUNCTIONS ***/
/*****************************/
function initCountryView() {
  $('.country-panel').scrollTop(0);
  initCountryPanel();
}

function initCountryLayer() {
  //color scale
  countryColorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
  createCountryLegend(countryColorScale);

  //initIDPLayer();
  initBorderCrossingLayer();
  initLocationLabels();
  initAcledLayer();
  initRefugeeLayer();

  //mouse events
  map.on('mouseenter', countryLayer, onMouseEnter);
  map.on('mouseleave', countryLayer, onMouseLeave);
  map.on('mousemove', countryLayer, function(e) {  
    if (currentCountryIndicator.id!='#acled+events') {
      var f = map.queryRenderedFeatures(e.point)[0];
      if (f.properties.ADM0_PCODE!=undefined && f.properties.ADM0_REF==currentCountry.name) {
        map.getCanvas().style.cursor = 'pointer';
        if (f.layer.id!='hostilities-layer') createCountryMapTooltip(f.properties.ADM1_REF, f.properties.ADM1_PCODE, e.point);
        tooltip
          .addTo(map)
          .setLngLat(e.lngLat);
      }
      else {
        if (f.layer.id!='hostilities-layer' && f.layer.id!='country-labels' && f.layer.id!='adm1-label' && f.layer.id!='town-dots') {
          map.getCanvas().style.cursor = '';
          tooltip.remove();
        }
        else {
          tooltip
            .addTo(map)
            .setLngLat(e.lngLat);
        } 
      }
    }
  });    
}


function initIDPLayer() {
  const max = d3.max(idpMacroData, function(d) { return +d['#affected+idps']; });
  const colorScale = d3.scaleQuantize().domain([0, max]).range(idpColorRange);

  //match macro region features with idp data
  idpGeoJson.features.forEach(function(f) {
    let prop = f.properties;
    idpMacroData.forEach(function(d) {
      if (d['#region+macro+name']!==undefined) {
        if (prop.ADM1_EN!=='') {
          if (prop.ADM1_EN.toLowerCase()==d['#region+macro+name'].toLowerCase()) {
            prop.idpPresence = d['#affected+idps'];
            prop.color = colorScale(d['#affected+idps']);
          }
        }
        else {
          prop.idpPresence = '';
          prop.color = '#FFF';
        }
      }
    });
  });

  map.addSource('macro-region-data', {
    type: 'geojson',
    data: idpGeoJson
  });

  map.addLayer({
    id: 'macro-regions',
    source: 'macro-region-data',
    type: 'fill',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-outline-color': '#E0E0E0'
    }
  }, globalLabelLayer);

  //mouse events
  map.on('mouseenter', 'macro-regions', onMouseEnter);
  map.on('mouseleave', 'macro-regions', onMouseLeave);
  map.on('mousemove', 'macro-regions', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    const macroRegion = e.features[0].properties.ADM1_EN;
    const content = (macroRegion=='') ? 'IDP Estimate:<div class="stat">No Data</div>' : `<h2>${macroRegion} Region</h2>IDP Estimate:<div class="stat">${numFormat(e.features[0].properties.idpPresence)}</div>`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
}


function initBorderCrossingLayer() {
  map.addSource('border-crossings', {
    type: 'geojson',
    data: borderCrossingData,
    generateId: true 
  });

  //add operational crossings
  map.addLayer({
    id: 'border-crossings-layer',
    type: 'symbol',
    source: 'border-crossings',
    layout: {
      'icon-image': 'marker-border-crossing',
      'icon-size': 0.6,
      'icon-allow-overlap': isMobile ? false : true
    },
    'filter': ['==', 'Status', 'Operational']
  });

  //add closed crossings
  map.addLayer({
    id: 'border-crossings-closed-layer',
    type: 'symbol',
    source: 'border-crossings',
    layout: {
      'icon-image': 'marker-border-crossing-closed',
      'icon-size': 0.6,
      'icon-allow-overlap': isMobile ? false : true
    },
    'filter': ['==', 'Status', 'Closed']
  });

  //mouse events
  map.on('mouseenter', 'border-crossings-layer', onMouseEnter);
  map.on('mouseleave', 'border-crossings-layer', onMouseLeave);
  map.on('mousemove', 'border-crossings-layer', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    let content = `Border Crossing:<h2>${e.features[0].properties['Name_ENG']}</h2>`;
    content += `Status: ${e.features[0].properties['Status']}`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
  map.on('mouseenter', 'border-crossings-closed-layer', onMouseEnter);
  map.on('mouseleave', 'border-crossings-closed-layer', onMouseLeave);
  map.on('mousemove', 'border-crossings-closed-layer', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    let content = `Border Crossing:<h2>${e.features[0].properties['Name_ENG']}</h2>`;
    content += `Status: ${e.features[0].properties['Status']}`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
}


function initLocationLabels() {
  //surrounding country data
  map.addSource('country-data', {
    type: 'geojson',
    data: countryData,
    generateId: true 
  });

  //country labels
  map.addLayer({
    id: 'country-labels',
    type: 'symbol',
    source: 'country-data',
    layout: {
      'text-field': [
        'format',
        ['upcase', ['get', 'CNTRY']]
      ],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-allow-overlap': true,
      'text-letter-spacing': 0.3
    },
    paint: {
      'text-color': '#666',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  });


  //town/capital data
  map.addSource('location-data', {
    type: 'geojson',
    data: locationData,
    generateId: true 
  });

  //towm markers
  map.addLayer({
    id: 'town-dots',
    type: 'symbol',
    source: 'location-data',
    filter: ['==', 'TYPE', 'ADMIN 1'],
    layout: {
      'icon-image': 'marker-town',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 1],
      'icon-allow-overlap': true,
      'text-field': ['get', 'CAPITAL'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.4
    },
    paint: {
      'text-color': '#888',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  }, globalLabelLayer);


  //capital markers
  map.addLayer({
    id: 'marker-capital',
    type: 'symbol',
    source: 'location-data',
    filter: ['==', 'TYPE', 'TERRITORY'],
    layout: {
      'icon-image': 'marker-capital',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 4, 0.9],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-field': ['get', 'CAPITAL'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.7,
      'text-allow-overlap': true,
      'text-ignore-placement': true
    },
    paint: {
      'text-color': '#888',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  }, globalLabelLayer);

}


function initHostilityLayer() {
  //add hostilty markers
  map.addSource('hostility-data', {
    type: 'geojson',
    data: hostilityData,
    generateId: true 
  });
  map.addLayer({
    id: 'hostilities-layer',
    type: 'symbol',
    source: 'hostility-data',
    layout: {
      'icon-image': 'marker-hostility',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 4, 1.5, 6, 1.8],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-field': ["get", "NAME"],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 10, 4, 12],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.7
    },
    paint: {
      'text-color': '#000',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1,
    }
  });
}


function initAcledLayer() {
  let maxCount = d3.max(cleanedCoords, function(d) { return +d['#affected+killed']; });
  let dotScale = d3.scaleSqrt()
    .domain([1, maxCount])
    .range([4, 16]);

  //get unique event types
  let acledEvents = [...new Set(cleanedCoords.map(d => d['#event+type']))];
  
  //build expression for event dot circles
  let eventTypeColorScale = ['match', ['get', 'event_type']];
  for (const [index, event] of acledEvents.sort().entries()) {
    eventTypeColorScale.push(event);
    eventTypeColorScale.push(eventColorRange[index]);
  }
  eventTypeColorScale.push('#666');

  let events = [];
  for (let e of cleanedCoords) {
    events.push({
      'type': 'Feature',
      'properties': {
        'adm1': e['#adm1+name'],
        'adm3': e['#adm3+name'],
        'event_type': e['#event+type'],
        'date': e['#date+occurred'],
        'fatalities': e['#affected+killed'],
        'notes': e['#description'],
        'iconSize': dotScale(e['#affected+killed'])
      },
      'geometry': { 
        'type': 'Point', 
        'coordinates': e['#coords']
      } 
    })
  }
  let eventsGeoJson = {
    'type': 'FeatureCollection',
    'features': events
  };
  map.addSource('acled', {
    type: 'geojson',
    data: eventsGeoJson,
    generateId: true 
  });

  map.addLayer({
    id: 'acled-dots',
    type: 'circle',
    source: 'acled',
    paint: {
      'circle-color': eventTypeColorScale,
      'circle-stroke-color': eventTypeColorScale,
      'circle-opacity': 0.5,
      'circle-radius': ['get', 'iconSize'],
      'circle-stroke-width': 1,
    }
  });
  map.setLayoutProperty('acled-dots', 'visibility', 'none');


  //acled events mouse events
  map.on('mouseenter', 'acled-dots', onMouseEnter);
  map.on('mouseleave', 'acled-dots', onMouseLeave);
  map.on('mousemove', 'acled-dots', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    let prop = e.features[0].properties;
    let date = new Date(prop.date);
    let content = `<span class='small'>${format(date, 'MMM d, yyyy')}</span>`;
    content += `<h2>${prop.event_type}</h2>`;
    content += `<p>${prop.notes}</p>`;
    content += `<p>Fatalities: ${prop.fatalities}</p>`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
}


function initRefugeeLayer() {
  let maxCount = d3.max(nationalData, function(d) { return +d['#affected+refugees']; });
  let refugeeLineScale = d3.scaleLinear()
    .domain([1, maxCount])
    .range([2, 20]);

  let refugeeIconScale = d3.scaleLinear()
    .domain([1, maxCount])
    .range([0.25, 1]);

  //draw directional curved arrows
  for (let d of refugeeLineData.features) {
    const iso = d.properties.ISO_3;
    const start = d.geometry.coordinates[0];
    const end = d.geometry.coordinates[1];

    const curve = getCurvedLine(start, end);
    const bearing = curve.bearing;

    map.addSource(`route-${iso}`, {
      'type': 'geojson',
      'lineMetrics': true,
      'data': curve.line
    });

    //draw line
    map.addLayer({
      'id': `line-${iso}`,
      'type': 'line',
      'source': `route-${iso}`,
      'paint': {
        'line-color': '#0072BC',
        'line-opacity': 0.8,
        'line-width': refugeeLineScale(dataByCountry[iso][0]['#affected+refugees']),
        'line-gradient': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0, "rgba(0, 114, 188, 1)",
          1, "rgba(0, 114, 188, 0.2)"
        ]
      }
    });

    //get geo for arrow head and label
    map.addSource(`point-${iso}`, {
      'type': 'geojson',
      'data': {
        'type': 'FeatureCollection',
        'features': [
          {
            'type': 'Feature',
            'geometry': {
              'type': 'Point',
              'coordinates': end
            }
          }
        ]
      }
    });

    //attach arrow head
    map.addLayer({
      id: `arrow-${iso}`,
      type: 'symbol',
      source: `point-${iso}`,
      layout: {
        'icon-image': 'marker-arrowhead-blue',
        'icon-size': refugeeIconScale(dataByCountry[iso][0]['#affected+refugees']),
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-rotate': bearing+68,
        'icon-offset': [1, -20.5]
      },
      paint: {
        'icon-color': '#0072BC',
        'icon-opacity': 0.8
      }
    });


    //mouse events
    map.on('mouseenter', `arrow-${iso}`, onMouseEnter);
    map.on('mouseleave', `arrow-${iso}`, onMouseLeave);
    map.on('mousemove', `arrow-${iso}`, function(e) {
      map.getCanvas().style.cursor = 'pointer';
      let content = `<h2>${dataByCountry[iso][0]['#country+name']}</h2>`;
      content += `Number of Refugees from Ukraine:<br>`;
      content += `<span class="stat">${numFormat(dataByCountry[iso][0]['#affected+refugees'])}</span>`;
      tooltip.setHTML(content);
      tooltip
        .addTo(map)
        .setLngLat(e.lngLat);
    });


    map.on('mouseenter', `line-${iso}`, onMouseEnter);
    map.on('mouseleave', `line-${iso}`, onMouseLeave);
    map.on('mousemove', `line-${iso}`, function(e) {
      map.getCanvas().style.cursor = 'pointer';
      let content = `<h2>${dataByCountry[iso][0]['#country+name']}</h2>`;
      content += `Number of Refugees from Ukraine:<br>`;
      content += `<span class="stat">${numFormat(dataByCountry[iso][0]['#affected+refugees'])}</span>`;
      tooltip.setHTML(content);
      tooltip
        .addTo(map)
        .setLngLat(e.lngLat);
    });
  }
}

function updateCountryLayer() {
  colorNoData = '#F9F9F9';
  $('.no-data-key').hide();

  //max
  var max = getCountryIndicatorMax();
  if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
  if (currentCountryIndicator.id=='#loc+count+health') max = roundUp(max, 100);

  //color scale
  var clrRange = colorRange;
  switch(currentCountryIndicator.id) {
    case '#population':
      clrRange = populationColorRange;
      break;
    case '#affected+idps':
      clrRange = idpColorRange;
      break;
    case '#org+count+num':
      clrRange = orgsRange;
    default:
      //
  }
  var countryColorScale = d3.scaleQuantize().domain([0, max]).range(clrRange);

  $('.map-legend.country').removeClass('population acled idps');
  if (currentCountryIndicator.id=='#population') {
    $('.map-legend.country').addClass('population');
    countryColorScale = d3.scaleOrdinal().domain(['<1', '1-2', '2-5', '5-10', '10-25', '25-50', '>50']).range(populationColorRange);
  }
  else if (currentCountryIndicator.id=='#acled+events') {
    $('.map-legend.country').addClass('acled');
    countryColorScale = d3.scaleOrdinal()
      .domain(['Battles', 'Explosions/Remote violence', 'Riots', 'Violence against civilians'])
      .range(eventColorRange);
  }
  else if (currentCountryIndicator.id=='#affected+idps') {
    $('.no-data-key').show();
    $('.map-legend.country').addClass('idps');

    // let max = d3.max(idpGeoJson.features, function(d) { return +d.properties.idpPresence; });
    // countryColorScale = d3.scaleQuantize().domain([0, max]).range(idpColorRange);
  }
  else if (currentCountryIndicator.id=='#org+count+num') {
    $('.no-data-key').show();
    //$('.map-legend.country').addClass('idps');
  }
  else if (currentCountryIndicator.id=='#affected+inneed+total') {
    $('.no-data-key').show();
    countryColorScale = d3.scaleQuantize().domain([0, max]).range(pinColorRange);
  }
  else {}

  updateCountryLegend(countryColorScale);

  //data join
  var expression = ['match', ['get', 'ADM1_PCODE']];
  var expressionBoundary = ['match', ['get', 'ADM1_PCODE']];
  var expressionOpacity = ['match', ['get', 'ADM1_PCODE']];
  subnationalData.forEach(function(d) {
    var color, boundaryColor, layerOpacity, markerSize;
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      layerOpacity = 1;
      color = (val<0 || !isVal(val) || isNaN(val)) ? colorNoData : countryColorScale(val);

      //turn off choropleth for population layer
      color = (currentCountryIndicator.id=='#population') ? colorDefault : color;
    }
    else {
      color = colorDefault;
      boundaryColor = '#E0E0E0';
      layerOpacity = 0;
    }
    
    expression.push(d['#adm1+code'], color);
    expressionBoundary.push(d['#adm1+code'], boundaryColor);
    expressionOpacity.push(d['#adm1+code'], layerOpacity);
  });
  //set expression defaults
  expression.push(colorDefault);
  expressionBoundary.push('#E0E0E0');
  expressionOpacity.push(0);

  //hide all pop density rasters
  var countryList = Object.keys(countryCodeList);
  countryList.forEach(function(country_code) {
    var id = country_code.toLowerCase();
    if (map.getLayer(id+'-popdensity'))
      map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
  });

  //set properties
  if (currentCountryIndicator.id=='#population') {
    var id = currentCountry.code.toLowerCase();
    map.setLayoutProperty(id+'-popdensity', 'visibility', 'visible');
  }
  map.setPaintProperty(countryLayer, 'fill-color', expression);
  //map.setPaintProperty(countryBoundaryLayer, 'line-opacity', expressionOpacity);
  map.setPaintProperty(countryBoundaryLayer, 'line-color', '#C4C4C4');//expressionBoundary
  map.setPaintProperty(countryLabelLayer, 'text-opacity', expressionOpacity);


  //toggle layers
  if (currentCountryIndicator.id=='#acled+events') {
    resetLayers();
    map.setLayoutProperty('acled-dots', 'visibility', 'visible');
    map.setLayoutProperty('border-crossings-layer', 'visibility', 'none');
    map.setLayoutProperty('border-crossings-closed-layer', 'visibility', 'none');
  }
  // else if (currentCountryIndicator.id=='#affected+idps') {
  //   resetLayers();
  //   map.setLayoutProperty(countryLayer, 'visibility', 'none');
  // }
  else {
    resetLayers();
  }
}


function resetLayers() {
  map.setLayoutProperty(countryLayer, 'visibility', 'visible')
  map.setLayoutProperty('acled-dots', 'visibility', 'none');
  map.setLayoutProperty('border-crossings-layer', 'visibility', 'visible');
  map.setLayoutProperty('border-crossings-closed-layer', 'visibility', 'visible');
}


function createCountryLegend(scale) {
  //set data sources
  createSource($('.map-legend.country .pin-source'), '#affected+inneed+total');
  createSource($('.map-legend.country .idp-source'), '#affected+idps');
  createSource($('.map-legend.country .acled-source'), '#date+latest+acled');
  createSource($('.map-legend.country .orgs-source'), '#org+count+num');
  createSource($('.map-legend.country .population-source'), '#population');
  createSource($('.map-legend.country .health-facilities-source'), '#loc+count+health');
  createSource($('.map-legend.country .refugee-arrivals-source'), '#affected+refugees');
  createSource($('.map-legend.country .border-crossing-source'), '#geojson');

  var legend = d3.legendColor()
    .labelFormat(percentFormat)
    .cells(colorRange.length)
    .scale(scale);

  var div = d3.select('.map-legend.country .legend-scale');
  var svg = div.append('svg')
    .attr('class', 'legend-container');

  svg.append('g')
    .attr('class', 'scale')
    .call(legend);

  //no data
  var nodata = div.append('svg')
    .attr('class', 'no-data-key');

  nodata.append('rect')
    .attr('width', 15)
    .attr('height', 15);

  nodata.append('text')
    .attr('class', 'label')
    .text('No Data');

  //boundaries disclaimer
  createFootnote('.map-legend.country', '', 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.');

  //expand/collapse functionality
  $('.map-legend.country .toggle-icon, .map-legend.country .collapsed-title').on('click', function() {
    $(this).parent().toggleClass('collapsed');
    $('.legend-gradient').toggleClass('collapsed');
  });
}


function updateCountryLegend(scale) {
  //set format for legend format
  let legendFormat = (currentCountryIndicator.id=='#affected+idps' || currentCountryIndicator.id=='#population' || currentCountryIndicator.id=='#affected+inneed+total') ? shortenNumFormat : d3.format('.0f');

  //set legend title
  let legendTitle = $('input[name="countryIndicators"]:checked').attr('data-legend');
  $('.map-legend.country .legend-title').html(legendTitle);

  //update legend
  if (currentCountryIndicator.id=='#acled+events') {
    if (d3.selectAll('.legendCells-events').empty()) {
      var svg = d3.select('.map-legend.country .scale');
      svg.append("g")
        .attr("class", "legendCells-events")
        .attr("transform", "translate(6,10)");

      var legendOrdinal = d3.legendColor()
        .shape("path", d3.symbol().type(d3.symbolCircle).size(90)())
        .shapePadding(3)
        .scale(scale);

      svg.select(".legendCells-events")
        .call(legendOrdinal);
    }
  }
  else {
    var legend = d3.legendColor()
      .labelFormat(legendFormat)
      .cells(colorRange.length)
      .scale(scale);

    var g = d3.select('.map-legend.country .scale');
    g.call(legend);
  }
}


function getCountryIndicatorMax() {
  var max =  d3.max(subnationalData, function(d) { 
    if (d['#country+code']==currentCountry.code) {
      return +d[currentCountryIndicator.id]; 
    }
  });
  return max;
}


//mouse event/leave events
function onMouseEnter(e) {
  map.getCanvas().style.cursor = 'pointer';
  tooltip.addTo(map);
}
function onMouseLeave(e) {
  map.getCanvas().style.cursor = '';
  tooltip.remove();
}


/*************************/
/*** TOOLTIP FUNCTIONS ***/
/*************************/
function createCountryMapTooltip(adm1_name, adm1_pcode, point) {
  var adm1 = subnationalData.filter(function(c) {
    if (c['#adm1+code']==adm1_pcode && c['#country+code']==currentCountry.code)
      return c;
  });

  if (adm1[0]!=undefined) {
    var val = adm1[0][currentCountryIndicator.id];
    var label = currentCountryIndicator.name;

    //format content for tooltip
    if (val!=undefined && val!='' && !isNaN(val)) {
      if (currentCountryIndicator.id.indexOf('pct')>-1) val = (val>1) ? percentFormat(1) : percentFormat(val);
      if (currentCountryIndicator.id=='#population') val = shortenNumFormat(val);
      if (currentCountryIndicator.id=='#affected+idps' || currentCountryIndicator.id=='#loc+count+health') val = numFormat(val);
      if (currentCountryIndicator.id=='#org+count+num') label = 'Humanitarian organizations present';
    }
    else {
      val = 'No Data';
    }

    let content = '';
    if (val!='No Data' && currentCountryIndicator.id=='#org+count+num') {
      //humanitarian presence layer
      let sectors = adm1[0]['#sector+cluster+names'].split(';');
      content = `<h2>${adm1_name} Oblast</h2>`;
      content += `<div class="table-display layer-orgs">`;
      content += `<div class="table-row"><div>People Reached:</div><div>${numFormat(adm1[0]['#reached+ind'])}</div></div>`;
      content += `<div class="table-row"><div>People Targeted:</div><div>${numFormat(adm1[0]['#targeted+total'])}</div></div>`;
      content += `<div class="table-row"><div>${label}:</div><div>${val}</div></div>`;
      content += `<div class="table-row row-separator"><div>Clusters present:</div><div>${sectors.length}</div></div>`;
      sectors.forEach(function(sector, index) {
        sector = sector.trimStart();
        content += `<div class="table-row breakdown"><div><i class="${humIcons[sector]}"></i> ${sector}</div></div>`;
      });
      content += `</div>`;
    }
    else if (val!='No Data' && currentCountryIndicator.id=='#affected+inneed+total') {
      content = `<h2>${adm1_name} Oblast</h2>${label}:<div class="stat">${numFormat(val)}</div>`;
      content += `<div class="table-display">`;
      content += `<div class="table-row"><div>People Affected:</div><div>${numFormat(adm1[0]['#affected+total'])}</div></div>`;
      content += `<div class="table-row"><div>People Targeted:</div><div>${numFormat(adm1[0]['#targeted+total'])}</div></div>`;
      content += `<div class="table-row"><div>IDPs in Need:</div><div>${numFormat(adm1[0]['#affected+idps'])}</div></div>`;
      content += `<div class="table-row"><div>Non-displaced People in Need:</div><div>${numFormat(adm1[0]['#affected+inneed+nondisplaced'])}</div></div>`;
      content += `<div class="table-row"><div>Returnees in Need:</div><div>${numFormat(adm1[0]['#affected+inneed+returnees'])}</div></div>`;
      content += `</div>`;
    }
    else {
      content = `<h2>${adm1_name} Oblast</h2>${label}:<div class="stat">${val}</div>`;
    }

    tooltip.setHTML(content);
    //if (!isMobile) setTooltipPosition(point)
  }
}

function setTooltipPosition(point) {
  var tooltipWidth = $('.map-tooltip').width();
  var tooltipHeight = $('.map-tooltip').height();
  var anchorDirection = (point.x + tooltipWidth > viewportWidth) ? 'right' : 'left';
  var yOffset = 0;
  if (point.y + tooltipHeight/2 > viewportHeight) yOffset = viewportHeight - (point.y + tooltipHeight/2);
  if (point.y - tooltipHeight/2 < 0) yOffset = tooltipHeight/2 - point.y;
  var popupOffsets = {
    'right': [0, yOffset],
    'left': [0, yOffset]
  };
  tooltip.options.offset = popupOffsets;
  tooltip.options.anchor = anchorDirection;

  if (yOffset>0) {
    $('.mapboxgl-popup-tip').css('align-self', 'flex-start');
    $('.mapboxgl-popup-tip').css('margin-top', point.y);
  }
  else if (yOffset<0)  {
    $('.mapboxgl-popup-tip').css('align-self', 'flex-end');
    $('.mapboxgl-popup-tip').css('margin-bottom', viewportHeight-point.y-10);
  }
  else {
    $('.mapboxgl-popup-tip').css('align-self', 'center');
    $('.mapboxgl-popup-tip').css('margin-top', 0);
    $('.mapboxgl-popup-tip').css('margin-bottom', 0);
  }
}


/***********************/
/*** PANEL FUNCTIONS ***/
/***********************/
function initCountryPanel() {
  var data = dataByCountry[currentCountry.code][0];

  //timeseries
  //updateTimeseries(data['#country+name']);

  //set panel header
  $('.flag').attr('src', 'assets/flags/'+data['#country+code']+'.png');
  $('.country-panel h3').text(data['#country+name'] + ' Data Explorer');

   //black sea grain initiative key figures
  var grainDiv = $('.country-panel .grain .panel-inner');
  grainDiv.append('<p style="font-size: 13px;">*Data on the Black Sea Grain Initiative vessel movements covers the period 1 August 2022 - 17 July 2023. The Initiative was not renewed after its third term, which expired on 17 July 2023.</p>');
  createFigure(grainDiv, {className: 'voyages', title: 'Number of Outbound Voyages', stat: numFormat(data['#indicator+voyages+num']), indicator: '#indicator+voyages+num'});
  createFigure(grainDiv, {className: 'tonnage', title: 'Tonnage of Commodities', stat: shortenNumFormat(data['#indicator+commodities+num']), indicator: '#indicator+commodities+num'});
  createFigure(grainDiv, {className: 'wheat', title: 'Quantity of wheat shipped to lower-income countries [?]', stat: shortenNumFormat(data['#indicator+commodities+wheat+num']), indicator: '#indicator+commodities+wheat+num', tooltip: 'The term "lower-income" refers to low-income and lower-middle-income countries.'});
  createFigure(grainDiv, {className: 'wheat-pct', title: 'Proportion of wheat shipped to lower-income countries [?]', stat: percentFormat(data['#indicator+commodities+wheat+pct']), indicator: '#indicator+commodities+wheat+pct', tooltip: 'The term "lower-income" refers to low-income and lower-middle-income countries.'});

  //humanitarian impact key figures
  var humImpactDiv = $('.country-panel .hum-impact .panel-inner');
  createFigure(humImpactDiv, {className: 'affected', title: 'People Affected', stat: oneDecNumFormat(data['#affected+total']), indicator: '#affected+total'});
  createFigure(humImpactDiv, {className: 'targeted', title: 'People Targeted', stat: oneDecNumFormat(data['#targeted+total']), indicator: '#targeted+total'});
  createFigure(humImpactDiv, {className: 'pin', title: 'People in Need', stat: oneDecNumFormat(data['#affected+inneed+total']), indicator: '#affected+inneed+total'});
  createFigure(humImpactDiv, {className: 'people-reached', title: 'People reached within Ukraine (total)', stat: oneDecNumFormat(data['#reached+ind']), indicator: '#reached+ind'});
  createFigure(humImpactDiv, {className: 'casualties-killed', title: 'Civilian Casualties - Killed', stat: numFormat(data['#affected+killed']), indicator: '#affected+killed'});
  createFigure(humImpactDiv, {className: 'casualties-injured', title: 'Civilian Casualties - Injured', stat: numFormat(data['#affected+injured']), indicator: '#affected+injured'});
  createFigure(humImpactDiv, {className: 'refugees', title: 'Refugees from Ukraine recorded across Europe (total)', stat: shortenNumFormat(regionalData['#affected+refugees']), indicator: '#affected+refugees'});
  createFigure(humImpactDiv, {className: 'returnees', title: 'Estimated Number of Returnees', stat: shortenNumFormat(data['#affected+returnees+ind']), indicator: '#affected+returnees+ind'});
  createFigure(humImpactDiv, {className: 'idps', title: 'Internally Displaced People (estimated)', stat: shortenNumFormat(data['#affected+idps']), indicator: '#affected+idps'});
  createFigure(humImpactDiv, {className: 'orgs', title: 'Humanitarian orgs present within Ukraine (total)', stat: numFormat(data['#org+count+num']), indicator: '#org+count+num'});
  // createFigure(humImpactDiv, {className: 'attacks-health', title: 'Attacks on Health Care', stat: numFormat(data['#indicator+attacks+healthcare+num']), indicator: '#indicator+attacks+healthcare+num'});
  // createFigure(humImpactDiv, {className: 'attacks-education', title: 'Attacks on Education Facilities', stat: numFormat(data['#indicator+attacks+education+num']), indicator: '#indicator+attacks+education+num'});

  //refugee sparkline
  var sparklineArray = [];
  refugeeTimeseriesData.forEach(function(d) {
    var obj = {date: d['#affected+date+refugees'], value: d['#affected+refugees']};
    sparklineArray.push(obj);
  });

  if ($('.figure.refugees .stat .sparkline').length<=0) createSparkline(sparklineArray, '.figure.refugees .stat');

  //casualty sparklines
  let killedArray = [];
  let injuredArray = [];
  casualtiesTimeseriesData.forEach(function(d) {
    let killedObj = {date: d['#date'], value: d['#affected+killed']};
    killedArray.push(killedObj);

    let injuredObj = {date: d['#date'], value: d['#affected+injured']};
    injuredArray.push(injuredObj);
  });
  createSparkline(killedArray, '.figure.casualties-killed .stat');
  createSparkline(injuredArray, '.figure.casualties-injured .stat');


  //funding
  var fundingDiv = $('.country-panel .funding .panel-inner');
  fundingDiv.children().remove();
  createFigure(fundingDiv, {className: 'funding-regional-required', title: 'Regional Refugee Response Plan Requirement', stat: formatValue(regionalData['#value+funding+rrp+required+usd']), indicator: '#value+funding+rrp+required+usd'});
  createFigure(fundingDiv, {className: 'funding-regional-allocation', title: 'Regional Refugee Response Plan Funding', stat: formatValue(regionalData['#value+funding+rrp+total+usd']), indicator: '#value+funding+rrp+total+usd'});
  createFigure(fundingDiv, {className: 'funding-humanitarian-required', title: 'CERF Allocation', stat: formatValue(data['#value+cerf+funding+total+usd']), indicator: '#value+cerf+funding+total+usd'});
  createFigure(fundingDiv, {className: 'funding-humanitarian-allocation', title: 'Humanitarian Fund Allocation', stat: formatValue(data['#value+funding+uhf+usd']), indicator: '#value+funding+uhf+usd'});

  createPieChart([regionalData['#value+funding+rrp+required+usd'], regionalData['#value+funding+rrp+total+usd']], '.figure.funding-regional-required .stat');
}



function createFigure(div, obj) {
  div.append(`<div class="figure ${obj.className}"><div class="figure-inner"></div></div>`);
  var divInner = $('.'+ obj.className +' .figure-inner');
  if (obj.title != undefined) divInner.append(`<h6 class="title">${obj.title}</h6>`);
  divInner.append(`<p class="stat">${obj.stat}</p>`);

  if (obj.indicator!='')
    createSource(divInner, obj.indicator);

  if (obj.tooltip!=undefined) {
    divInner.find('.title').on('mouseenter', function(e) {
      let pos = $(e.currentTarget).position();
      $('.panel-tooltip .tooltip-inner').html(obj.tooltip);
      $('.panel-tooltip').css('opacity', 0.9);
      $('.panel-tooltip').css('top', `${pos.top - $('.panel-tooltip').height() - 10}px`);
      $('.panel-tooltip').css('left', `${pos.left + $(this).width()/2 - $('.panel-tooltip').width()/2}px`);
    });
    divInner.find('.title').on('mouseout', function(e) {
      $('.panel-tooltip').css('opacity', 0);
    });
  }
}


/************************/
/*** SOURCE FUNCTIONS ***/
/************************/
function createSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));

  //format date for acled source
  if (indicator=='#date+latest+acled') {
    sourceObj['#date+start'] = getSource('#date+start+conflict')['#date'];
    let startDate = new Date(sourceObj['#date+start']);
    date = `${d3.utcFormat("%b %d")(startDate)} - ${date}`;
  }
  //dont show data link for hostilities, sent to undefined
  if (indicator=='#event+loc') {
    sourceObj['#meta+url'] = undefined;
  }

  var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
  var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
  let sourceContent = `<p class='small source'><span class='date'>${date}</span> | <span class='source-name'>${sourceName}</span>`;
  if (sourceURL!=='#') sourceContent += ` | <a href='${sourceURL}' class='dataURL' target='_blank' rel='noopener'>DATA</a>`;
  sourceContent += `</p>`;
  div.append(sourceContent);
}

function updateSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
  var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
  var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
  div.find('.date').text(date);
  div.find('.source-name').text(sourceName);
  div.find('.dataURL').attr('href', sourceURL);
}

function getSource(indicator) {
  var isGlobal = ($('.content').hasClass('country-view')) ? false : true;
  var obj = {};
  sourcesData.forEach(function(item) {
    if (item['#indicator+name']==indicator) {
      obj = item;
    }
  });
  return obj;
}
var numFormat = d3.format(',');
var shortenNumFormat = d3.format('.2s');
var percentFormat = d3.format('.1%');
var dateFormat = d3.utcFormat("%b %d, %Y");
var chartDateFormat = d3.utcFormat("%-m/%-d/%y");
var colorRange = ['#F7FCB9', '#D9F0A3', '#ADDD8E', '#78C679', '#41AB5D'];
var populationColorRange = ['#F7FCB9', '#D9F0A3', '#ADDD8E', '#78C679', '#41AB5D', '#238443', '#005A32'];
var eventColorRange = ['#EEB598','#CE7C7F','#60A2A4','#91C4B7'];
var idpColorRange = ['#D1E3EA','#BBD1E6','#ADBCE3','#B2B3E0','#A99BC6'];
var pinColorRange = ['#ffcdb2','#f2b8aa','#e4989c','#b87e8b','#925b7a'];
//var pinColorRange = ['#e0cff6','#d2bbed','#c3a5e7','#a784ce','#956ec2'];
var orgsRange = ['#d5efe6','#c5e1db','#91c4bb','#81aaa4','#6b8883'];
var colorDefault = '#F2F2EF';
var colorNoData = '#FFF';
var regionBoundaryData, regionalData, nationalData, subnationalDataByCountry, dataByCountry, colorScale, viewportWidth, viewportHeight = '';
var countryTimeseriesChart = '';
var mapLoaded = false;
var dataLoaded = false;
var viewInitialized = false;
var isMobile = false;
var zoomLevel = 1.4;
var minZoom = 4;

var globalCountryList = [];
var currentCountryIndicator = {};
var currentCountry = {};

var refugeeTimeseriesData, refugeeCountData, casualtiesTimeseriesData, borderCrossingData, acledData, locationData, hostilityData, refugeeLineData, cleanedCoords, idpGeoJson, humIcons, countryData = '';

mapboxgl.baseApiUrl='https://data.humdata.org/mapbox';
mapboxgl.accessToken = 'cacheToken';

$( document ).ready(function() {
  var prod = (window.location.href.indexOf('ocha-dap')>-1 || window.location.href.indexOf('data.humdata.org')>-1) ? true : false;
  //console.log(prod);

  var tooltip = d3.select('.tooltip');
  var minWidth = 1000;
  viewportWidth = (window.innerWidth<minWidth) ? minWidth : window.innerWidth;
  viewportHeight = window.innerHeight;


  function init() {
    //detect mobile users
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
      $('.mobile-message').show();
      isMobile = true;
      minZoom = 1;
      zoomLevel = 3;
    }
    $('.mobile-message').on('click', function() {
      $(this).remove();
    });

    //set content sizes based on viewport
    $('.content').width(viewportWidth);
    $('.content').height(viewportHeight);
    $('.content-right').width(viewportWidth);
    $('.country-panel .panel-content').height(viewportHeight - $('.country-panel .panel-content').position().top);
    $('.map-legend.country').css('max-height', viewportHeight - 200);
    if (viewportHeight<696) {
      zoomLevel = 1.4;
    }
    $('#chart-view').height(viewportHeight-$('.tab-menubar').outerHeight()-30);

    //load static map -- will only work for screens smaller than 1280
    if (viewportWidth<=1280) {
      var staticURL = 'https://api.mapbox.com/styles/v1/humdata/cl0cqcpm4002014utgdbhcn4q/static/-25,0,2/'+viewportWidth+'x'+viewportHeight+'?access_token='+mapboxgl.accessToken;
      $('#static-map').css('background-image', 'url('+staticURL+')');
    }

    getData();
    initMap();
  }

  function getData() {
    console.log('Loading data...')
    Promise.all([
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-ukraine-viz/main/all.json'),
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-ukraine-viz/main/UKR_Border_Crossings.geojson'),
      d3.json('data/ee-regions-bbox.geojson'),
      d3.json('data/ukr_refugee_lines.geojson'),
      d3.json('data/wrl_ukr_capp.geojson'),
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-ukraine-viz/main/UKR_Hostilities.geojson'),
      d3.json('data/macro-region.geojson'),
      d3.json('data/country.geojson')
    ]).then(function(data) {
      console.log('Data loaded');
      $('.loader span').text('Initializing map...');


      //parse data
      var allData = data[0];
      regionalData = allData.regional_data[0];
      nationalData = allData.national_data;
      subnationalData = allData.subnational_data;
      refugeeTimeseriesData = allData.refugees_series_data;
      acledData = allData.fatalities_data;
      sourcesData = allData.sources_data;
      idpMacroData = allData.idps_macro_data;
      casualtiesTimeseriesData = allData.timeseries_casualties_data;

      borderCrossingData = data[1];
      regionBoundaryData = data[2].features;
      refugeeLineData = data[3];
      locationData = data[4];
      hostilityData = data[5];
      idpGeoJson = data[6];
      countryData = data[7];
            
      //process acled data
      acledData.forEach(function(event) {
        event['#coords'] = [+event['#geo+lon'], +event['#geo+lat']];
      });

      //group by coords
      let coordGroups = d3.nest()
        .key(function(d) { return d['#coords']; })
        .entries(acledData);

      //nudge dots with duplicate coords
      cleanedCoords = [];
      coordGroups.forEach(function(coords) {
        if (coords.values.length>1)
          coords.values.forEach(function(c) {
            let origCoord = turf.point(c['#coords']);
            let bearing = randomNumber(-180, 180); //randomly scatter around origin
            let distance = randomNumber(2, 8); //randomly scatter by 2-8km from origin
            let newCoord = turf.destination(origCoord, distance, bearing);
            c['#coords'] = newCoord.geometry.coordinates;
            cleanedCoords.push(c);
          });
        else {
          cleanedCoords.push(coords.values[0]);
        }
      });


      //remove duplicate towns from location data if it exists in hostility data
      locationData.features = locationData.features.filter(locationObj => hostilityData.features.every(function(hostilityObj) {
        let isDuplicate = (locationObj.properties.TYPE!='TERRITORY') ? locationObj.properties.CAPITAL !== hostilityObj.properties.NAME : true;
        return isDuplicate;
      }));
      

      //format data
      subnationalData.forEach(function(item) {
        var pop = item['#population'];
        if (item['#population']!=undefined) item['#population'] = parseInt(pop.replace(/,/g, ''), 10);
      });

      //parse national data
      nationalData.forEach(function(item) {
        //keep global list of countries
        globalCountryList.push({
          'name': item['#country+name'],
          'code': item['#country+code']
        });
        globalCountryList.sort(function(a,b) {
          return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
        });
      });


      //group national data by country -- drives country panel    
      dataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .object(nationalData);


      //map humanitarian icons to sector clusters
      humIcons = {
        'Child Protection': 'humanitarianicons-Child-protection',
        'Camp Coordination and Camp Management': 'humanitarianicons-Camp-Coordination-and-Camp-Management',
        'Coordination and Common Services': 'humanitarianicons-Coordination',
        'Education': 'humanitarianicons-Education',
        'Emergency Telecommunications': 'humanitarianicons-Emergency-Telecommunications',
        'Food Security and Livelihoods': 'humanitarianicons-Food-Security',
        'Gender-Based Violence': 'humanitarianicons-Gender-based-violence',
        'General Protection': 'humanitarianicons-Protection',
        'Health': 'humanitarianicons-Health',
        'Logistics': 'humanitarianicons-Logistics',
        'Mine Action': 'humanitarianicons-Mine',
        'Multi-Purpose Cash': 'humanitarianicons-Fund',
        'Nutrition': 'fa-solid fa-person-breastfeeding',
        'Shelter and Non-Food Items': 'humanitarianicons-Shelter',
        'Water, Sanitation and Hygiene': 'humanitarianicons-Water-Sanitation-and-Hygiene',
      };


      dataLoaded = true;
      if (mapLoaded==true) displayMap();
      initView();
    });
  }


  function initView() {
    //load timeseries for country view 
    initTimeseries(acledData, '.trendseries-chart');

    //check map loaded status
    if (mapLoaded==true && viewInitialized==false)
      deepLinkView();

    //create tab events
    $('.tab-menubar .tab-button').on('click', function() {
      $('.tab-button').removeClass('active');
      $(this).addClass('active');
      if ($(this).data('id')=='chart-view') {
        $('#chart-view').show();
      }
      else {
        $('#chart-view').hide();
      }
      let location = ($(this).data('id')==undefined) ? window.location.pathname : window.location.pathname + '?tab=' + $(this).data('id');
      window.history.replaceState(null, null, location);
      vizTrack($(this).data('id'), currentCountryIndicator.name);
    });

    //create chart view country select
    $('.trendseries-select').append($('<option value="All">All Oblasts</option>')); 
    var trendseriesSelect = d3.select('.trendseries-select')
      .selectAll('option')
      .data(subnationalData)
      .enter().append('option')
        .text(function(d) {
          let name = (d['#adm1+code']=='UA80') ? d['#adm1+name'] + ' (city)' : d['#adm1+name'];
          return name; 
        })
        .attr('value', function (d) { return d['#adm1+code']; });

    viewInitialized = true;
  }


  function initCountryView() {
    $('.content').addClass('country-view');
    $('.country-panel').scrollTop(0);
    $('#population').prop('checked', true);
    currentCountryIndicator = {id: $('input[name="countryIndicators"]:checked').val(), name: $('input[name="countryIndicators"]:checked').parent().text()};

    initCountryPanel();
  }


  function initTracking() {
    //initialize mixpanel
    var MIXPANEL_TOKEN = window.location.hostname=='data.humdata.org'? '5cbf12bc9984628fb2c55a49daf32e74' : '99035923ee0a67880e6c05ab92b6cbc0';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  init();
  initTracking();
});