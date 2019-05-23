let config,
		map,
		projection,
		path,
		width,
		height,
		hasBase = false,
		dataLayer = false,
		navContent,
		navMap,
		state = {
			content:0,
			map:0
		},
		lang = 0;

d3.json("config.json")
	.then((_config) => {
		config = _config;

		// Position elements

		(["content", "footer", "navigation"]).forEach((item) => {
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
				.attr("height", height);

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
					});
		
		updateNav(0,0);

		// Setup Language Switch

		d3.selectAll("#lang-navigation li")
			.datum(function() { return this.dataset; })
			.on("click", (d) => {
				switchLang(parseInt(d.value));
			});
		
		switchLang(0);

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

const switchLang = (inputLang) => {
	lang = inputLang;

	d3.selectAll("#lang-navigation li")
		.classed("active", (d) => (lang == d.value) ? true : false);

	navContent.text((d) => d.nav[lang]);
	navMap.text((d) => d.nav[lang]);

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

	d3.json("data/" + mapConfig.data)
		.then(data => {

			// make sure the attribute column is a number
			data.features.forEach((d) => {
				d.properties[mapConfig.attribute] = parseFloat(d.properties[mapConfig.attribute]);
			});

			const scale = d3.scaleLinear()
				.domain(d3.extent(data.features, (d) => d.properties[mapConfig.attribute]))
				.range(("colors" in mapConfig) ? mapConfig.colors : ["#0042FF", "#FF003F"]);

			dataLayer.selectAll("*").remove();

			dataLayer.selectAll("path")
				.data(data.features)
				.enter()
				.append("path")
					.attr("d", path)
					.attr("fill", (d) => {
						return scale(d.properties[mapConfig.attribute]);
					});

		})
		.catch((err) => {
			console.log(err);
		})
}
