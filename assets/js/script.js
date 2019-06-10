let config,
		map,
		projection,
		path,
		width,
		height,
		hasBase = false,
		dataLayer = false,
		navContent,
		navLabels = [],
		navMap,
		legend,
		datas = {},
		state = {
			content:0,
			map:2,
			overlay: 0
		},
		lang = 0;

d3.json("config.json")
	.then((_config) => {
		config = _config;

		// Position elements

		(["content", "footer"]).forEach((item) => {
			d3.select(`#${item}`)
				.style("left", config.positions[item].x + "px")
				.style("top", config.positions[item].y + "px");
		});

		width = config.positions.map.width;
		height = config.positions.map.height;

		// Setup Map
		
		projection = d3.geoMercator()
			.center([13.41, 52.51])
			.scale(config.positions.map.scale)
			.translate([width/2, height/2]);
		
		path = d3.geoPath().projection(projection);

		map = d3.select("#map")
			.style("left", config.positions.map.x + "px")
			.style("top", config.positions.map.y + "px")
			.append("svg")
				.attr("width", width)
				.attr("height", height)
				.style("height", config.positions.map.sheight)
				.style("width", config.positions.map.swidth)
				.attr("preserveAspectRatio", "none")
				.attr("viewBox", `0 0 ${width} ${height}`);

		dataLayer = map.append("g")
			.attr("id", "dataLayer");

		baseMap();

		// Setup Navigation

		navContent = d3.select("#main-navigation")
			.selectAll("li")
				.data(config.content)
				.enter()
				.append("li")
					.text((d) => d.nav[lang])
					.on("click", (d, i) => {
						updateNav(i, 0);
						// updateOverlay(1);
						// console.log('click')
					});

		config.content.forEach((contentEl, contentId) => {
			config.content[contentId].maps.forEach((mapEl, mapId) => {
				preloadMap(contentId, mapId);
			});
		});

		legend = d3.select("#legend")
			.style("top", config.positions.legend.y + "px")
			.style("left", config.positions.legend.x + "px")
			.append("svg");

		// Setup Language Switch

		d3.selectAll("#lang-navigation li")
			.datum(function() { return this.dataset; })
			.on("click", (d) => {
				switchLang(parseInt(d.value));
			});
		
		setTimeout(() => {
			updateNav(2,0);
			switchLang(0);

			let labelCategory = d3.select("#nav-label-category")
			let labelFilter = d3.select("#nav-label-filter")
			let labelLang = d3.select("#nav-label-lang")

			navLabels.push(labelCategory, labelFilter, labelLang);
		}, 3200);
			

	})
	.catch((err) => {
		console.log(err);
	});

const updateNav = (contentState, mapState) => {
	state.content = contentState;
	state.map = mapState;

	navContent
		.classed("active", (d,i) => (i===state.content) ? true : false);
	
	d3.selectAll("#sub-navigation *").remove();

	navMap = d3.select("#sub-navigation")
		.selectAll("li")
			.data(config.content[state.content].maps)
			.enter()
			.append("li")
				.text((d) => d.nav[lang])
				.classed("active", (d,i) => (i===state.map) ? true : false)
				.on("click", (d, i) => {
					updateNav(state.content, i);
				});	

	makeMap(state.content, state.map);
}

const updateOverlay = (state) => {
	state.overlay = state;

	console.log(d3.select('#overlay-wrapper'), state)

	d3.select('#overlay-wrapper').classed('active', d => { return state == 0 ? false : true });
	
	setTimeout(() => {
		d3.select('#overlay-wrapper').classed('active', d => { 0 ? false : true });

	}, 1500)
} 

const switchLang = (inputLang) => {
	lang = inputLang;

	
	d3.selectAll("#lang-navigation li")
	.classed("active", (d) => (lang == d.value) ? true : false);
	
	navContent.text((d) => d.nav[lang]);
	navMap.text((d) => d.nav[lang]);
	
	navLabels.forEach((label,i) => {
		label.text(config.labels[i][lang]);
	})

	makeMap(state.content, state.map);
};

// This is only for debugging, this part will be printed in the end
const baseMap = () => {
	if (!hasBase) {
		hasBase = true;
		const g = map.append("g")
			.attr("id", "baseMap");
		
		Promise.all([
			d3.json("./data/bezirksgrenzen.geojson"),
			d3.json("./data/lor_bezirksregionen.geojson")
		])
		.then((data) => {

			const labels = ["bezirksgrenzen", "bezirksregionen"];

			data.forEach((d, i) => {
				g.append("g")
					.attr("id", labels[i])
					.selectAll("path")
						.data(d.features)
						.enter()
						.append("path")
							.attr("d", path);
			});
		})
		.catch((err) => {
			console.log(err);
		});
	}
}

const makeMap = (contentId, mapId) => {
	const mapConfig = config.content[contentId].maps[mapId];

	// Set Texts
	d3.select("#content-topic").html(config.content[contentId].title[lang]);
	d3.select("#content-title").html(mapConfig.title[lang]);
	d3.select("#content-description").html(mapConfig.description[lang]);

	// Make Map
	d3.selectAll("g.map")
		.style("display", "none");
	
	d3.select("#g" + contentId + "-" + mapId)
		.style("display", "block");
	
	legend.selectAll("*").remove();

	const gradient = legend.append("defs").append("linearGradient")
				.attr("id", "gradient")
				.attr("x1", 0)
				.attr("x2", 0)
				.attr("y1", 0)
				.attr("y2", 1);
	
	gradient.append("stop")
				.attr("offset", "0%")
				.attr("stop-color", (config.colorScale[0]));
	
	gradient.append("stop")
				.attr("offset", "100%")
				.attr("stop-color", (config.colorScale[1]));

	legend.append("text")
				.attr("transform", "translate(" + (config.positions.legend.width + 10) + ", 0) rotate(90)")
				.text(config.content[state.content].maps[state.map].legend[lang]);

	legend.append("rect")
				.attr("x", 0)
				.attr("y", 0)
				.style("fill", "url(#gradient)")
				.attr("width", config.positions.legend.width)
				.attr("height", config.positions.legend.height);
	
	legend.append("text")
				.attr("text-anchor", "end")
				.attr("transform", "translate(-10," + config.positions.legend.height + ")")
				.text(("extent" in mapConfig) ? mapConfig.extent[0] + " <" : d3.min(datas[contentId][mapId].features, (d) => d.properties[mapConfig.attribute]).toFixed(2));
	
	legend.append("text")
				.attr("text-anchor", "end")
				.attr("transform", "translate(-10,12)")
				.text(("extent" in mapConfig) ? mapConfig.extent[1] + " >" : d3.max(datas[contentId][mapId].features, (d) => d.properties[mapConfig.attribute]).toFixed(2));

	
}

const preloadMap = (contentId, mapId) => {
	const mapConfig = config.content[contentId].maps[mapId];

	d3.json("data/" + mapConfig.data)
		.then(data => {

			if (!(contentId in datas)) {
				datas[contentId] = {};
			}
			datas[contentId][mapId] = data;		

			// make sure the attribute column is a number
			data.features.forEach((d) => {
				d.properties[mapConfig.attribute] = parseFloat(d.properties[mapConfig.attribute]);
			});


			const colorScale = d3.scaleLinear()
				.domain(("extent" in mapConfig) ? mapConfig.extent : d3.extent(data.features, (d) => d.properties[mapConfig.attribute]))
                .range(config.colorScale)
                .interpolate(d3.interpolateRgb); //interpolateHsl interpolateHcl interpolateRgb

			// const scale = d3.scaleLinear()
			// 	.domain(("extent" in mapConfig) ? mapConfig.extent : d3.extent(data.features, (d) => d.properties[mapConfig.attribute]))
			// 	.range(("colors" in mapConfig) ? mapConfig.colors : ["#0042FF", "#FF003F"]);

			const g = dataLayer.append("g")
				.attr("id", "g" + contentId + "-" + mapId)
				.classed("map", true)
				.style("display", "none");

			g.selectAll("path")
				.data(data.features)
				.enter()
				.append("path")
					.attr("d", path)
					.attr("fill", (d) => {
						return colorScale(d.properties[mapConfig.attribute]);
					});

		})
		.catch((err) => {
			console.log(err);
		})
}
