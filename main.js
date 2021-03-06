/*   GLOBAL VARIABLES   */
var scene, camera, renderer, plotContainer, raycaster, mouse;
var uploader = document.getElementById("uploader");
var reader = new FileReader();
var unfiltered_data = [], savedFile;
var PWIDTH, HEIGHT;
var LWIDTH = document.getElementById('legend').offsetWidth,
    COLORBLOCK = 15,
    SPACING = 5;

init();
animate();

/*   GET DATA POINTS    */
reader.onload = function(e) {
    var contents = e.target.result;
    var rawData = contents.split(/\n/);
    var tempData = [];
    for (i = 0; i < rawData.length; i++) {
        pointData = rawData[i].split(/\s/);
        setData = pointData.filter(function(e) { return e!==""; });
        tempData.push(setData);
    }
    tempData.shift();
    unfiltered_data = getPts(tempData);
    plot_points(unfiltered_data);
};

uploader.addEventListener("change", upload, false);
uploader.addEventListener("click", function() { this.value = ""; });

function upload() {
    document.getElementById("tooltip").innerHTML = "Last Clicked: ";
    count_arr = checkCount();
    if (count_arr.length == 3) {
        var file = this.files[0];
        reader.readAsText(file);
        savedFile = file;
    }
    else if(!(count_arr.length == 3)) {
        if ( scene.getObjectByName('points') ) {
            scene.remove(scene.getObjectByName('points'));
            d3.select(".lcontainer").remove();
        }
        alert("Please Select Exactly 3 Values");
        this.value = "";
    }
}

function plot_points() {
    document.getElementById("tooltip").innerHTML = "Last Clicked: ";
    eig_arr = checkCount();
    if (eig_arr.length == 3) {
        var filtered_data = select_eigs(unfiltered_data);
        if( scene.getObjectByName('points') ) {
            scene.remove(scene.getObjectByName('points'));
            d3.select(".lcontainer").remove();
        }
        scatter(filtered_data);
    }
    else if(!(eig_arr.length == 3)) {
        if ( scene.getObjectByName('points') ) {
            scene.remove(scene.getObjectByName('points'));
            d3.select(".lcontainer").remove();
        }
        alert("Please Select Exactly 3 Values");
    }
}

/*      CREATE SCENE        */
function init() {
    scene = new THREE.Scene();

    plotContainer = document.getElementById('plot');
    document.body.appendChild(plotContainer);

    PWIDTH = plotContainer.offsetWidth;
    HEIGHT = plotContainer.offsetHeight;

    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(PWIDTH, HEIGHT);
    renderer.setClearColor(0x333F47, 1);
    plotContainer.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector3();

    camera = new THREE.PerspectiveCamera(45, PWIDTH / HEIGHT, 1, 10000);
    camera.position.set(0,10,250);
    camera.lookAt(new THREE.Vector3(0,0,0));
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    var light = new THREE.PointLight(0xffffff);
    light.position.set(-100, 200, 100);

    scene.add(light);
    scene.add(camera);

    window.addEventListener('resize', function() {
        PWIDTH = plotContainer.offsetWidth;
        HEIGHT = plotContainer.offsetHeight;
        var LWIDTH = document.getElementById('legend').offsetWidth;

        renderer.setSize(PWIDTH, HEIGHT);
        camera.aspect = PWIDTH / HEIGHT;
        camera.updateProjectionMatrix();

        d3.select(".lcontainer").attr("height", HEIGHT).attr("width", LWIDTH);
    });

    function buildAxes(length) {
        var axes = new THREE.Object3D();

        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( length, 0, 0 ), 0xA4A4A4, false ) ); // +X
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( -length, 0, 0 ), 0xA4A4A4, true) ); // -X
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, length, 0 ), 0x858585, false ) ); // +Y
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, -length, 0 ), 0x858585, true ) ); // -Y
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, length ), 0xC8C8C8, false ) ); // +Z
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -length ), 0xC8C8C8, true ) ); // -Z
        return axes;
    }
    var axes = buildAxes( 1000 );
    scene.add(axes);
}

/*      RENDER DATA        */
function scatter(data) {

    var categories = get_categories(data);

    var color = d3.scale.ordinal();
    color.domain(categories);
    color.range(color_set);

    points = new THREE.Object3D();
    points.name = "points";
    scene.add(points);

    createPoint(points, data, color);
    makeLegend(color, categories);

    clickOn(points, color);
    clickGray(points);
    clickOff(points);

    window.addEventListener("click", function(e) { return click(e, color); });
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
}

function click(event, color){
    color.domain(categories);

    mouse.x = ((event.clientX - renderer.domElement.offsetLeft) / renderer.domElement.width) * 2 - 1;
    mouse.y = - ((event.clientY - renderer.domElement.offsetTop) / renderer.domElement.height) * 2 + 1;

    raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    intersects = raycaster.intersectObjects(points.children, true);
    if(intersects.length > 0 ){
        var object = intersects[0].object;
        point_color = color(object.group);
        document.getElementById("tooltip").innerHTML = "Last Clicked: " + object.group + " | " + object.name ;
        if(object.state == "on") {
            intersects[0].object.material.color.setHex(0xa6a6a6);
            object.state = "gray";
        }
        else if(object.state == "gray") {
            intersects[0].object.material.color.setStyle(point_color);
            object.state = "on";
        }
        renderer.render(scene,camera);
    }
    event.stopImmediatePropagation();
}

/*        HELPERS          */
function buildAxis(src, dst, colorHex, dashed) {
    var geom = new THREE.Geometry(), mat;

    if(dashed) {
        mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3 });
    }
    else {
        mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
    }
    geom.vertices.push( src.clone() );
    geom.vertices.push( dst.clone() );
    geom.computeLineDistances();

    var axis = new THREE.Line( geom, mat, THREE.LineSegments );
    return axis;
}

function createPoint(points, data, color) {
    var xScale = d3.scale.linear()
        .domain(d3.extent(data, function (d) {return d.x; }))
        .range([-70,70]);
    var yScale = d3.scale.linear()
        .domain(d3.extent(data, function (d) {return d.y; }))
        .range([-70,70]);
    var zScale = d3.scale.linear()
        .domain(d3.extent(data, function (d) {return d.z; }))
        .range([-70,70]);

    var geom = new THREE.SphereGeometry(1, 32, 32);

    for (var i = 0; i < data.length; i ++) {
        var x = xScale(data[i].x),
            y = yScale(data[i].y),
            z = zScale(data[i].z),
            state = data[i].state,
            id = data[i].id,
            point;
            group = data[i].r;

        point = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            color: color(group)
        }));

        point.group = group;
        point.name = id;
        point.state = state;
        point.position.set(x, y, z);
        points.add(point);
    }
    return points;
}

function makeLegend(color, categories) {
    var svg = d3.select("#legend").append("svg")
        .attr("class", "lContainer")
        .attr("width", LWIDTH - 10)
        .attr("height", (categories.length + 1) * 20);

    legend = legendGroups(svg, categories, color);
    legendRect(color);
    legendText(categories);
}

function legendGroups(svg, categories, color) {
    var legend = svg.selectAll(".legend")
        .data(categories)
        .enter()
        .append("g")
        .attr("class", "ldata")
        .attr("state", "on")
        .attr("transform", function(d, i) {
            while (i <= categories.length) {
                var height = COLORBLOCK + SPACING;
                var horz = 5;
                var vert = (i * height) + 10 ;
                return "translate(" + horz + ", " + vert + ")";
            }
        })
        .on("click", function(group) { legendClick(group, this, color); });
    return legend;
}

function legendRect(color) {
    legend.append("rect")
        .attr("width", COLORBLOCK)
        .attr("height", COLORBLOCK)
        .style("fill", function(i) {
            return color(i);
        })
        .style("stroke", function(i) {
            return color(i);
        });
}

function legendText(categories) {
    legend.append("text")
        .attr("x", COLORBLOCK + SPACING)
        .attr("y", COLORBLOCK )
        .text(function (d, i) { while (i < categories.length) { return categories[i]; }});
}

function legendClick(group, clicked, color) {
    change = get_all(group, points); // array of Mesh's
    legend_state = clicked.getAttribute("state");
    if(legend_state == "on") {
        change.forEach(function(point) {
            d3.select(clicked).select("rect").style("fill", '#a6a6a6');
            for (i = 0; i < change.length; i++) {
                change[i].material.color.setHex(0xa6a6a6);
            }
            point.state = "gray";
        });
        clicked.setAttribute("state", "gray");
    }
    else if (legend_state == "gray") {
        change.forEach(function(point) {
            d3.select(clicked).select("rect").style("fill", '#ffffff');
            for (i = 0; i < change.length; i++) {
                change[i].material.visible = false;
            }
            point.state = "off";
        });
        clicked.setAttribute("state", "off");
    }
    else if (legend_state == "off") {
        change.forEach(function(point) {
            point_color = color(point.group);
            d3.select(clicked).select("rect")
                .style("fill", point_color);
            for (i = 0; i < change.length; i++) {
                change[i].material.color.setStyle(point_color);
                change[i].material.visible = true;
            }
            point.state = "on";
        });
        clicked.setAttribute("state", "on");
    }
}

function clickOn(points, color) {
    var button = document.getElementById("toggle_on");
    button.onclick = function () {
        array = points.children;
        d3.selectAll(".ldata").select("rect").style("fill", function(i) {
            return color(i); });
        array.forEach(function(i){
            i.material.color.setStyle(color(i.group));
            i.material.visible = true;
            i.state = "on"
        });
        d3.selectAll(".ldata").each(function() { d3.select(this).attr("state", "on"); });
    };
}

function clickGray(points) {
    var button = document.getElementById("toggle_gray");
    button.onclick = function () {
        array = points.children;
        d3.selectAll(".ldata").select("rect").style("fill", "#a6a6a6");
        array.forEach(function(i) {
            i.material.color.setHex(0xa6a6a6);
            i.material.visible = true;
            i.state = "gray"
        });
        d3.selectAll(".ldata").each(function() { d3.select(this).attr("state", "gray"); });
    };
}

function clickOff(points) {
    var button = document.getElementById("toggle_off");
    button.onclick = function () {
        array = points.children;
        d3.selectAll(".ldata").select("rect").style("fill", "#ffffff" );
        array.forEach(function(i) {
            i.material.visible = false;
            i.state = "off"
        });
        d3.selectAll(".ldata").each(function() { d3.select(this).attr("state", "off"); });
    };
}

function get_all(group, points) {
    var selected = [];
    array = points.children;
    array.forEach(function (p) {
        if (p.group == group) {
            selected.push(p);
        }
    });
    return selected;
}

function get_categories(data) {
    pointCount = data.length;
    categories = [];
    for (i=0; i<pointCount; i++) {
        var group = data[i].r;
        if (group) {
            if (categories.indexOf(group) == -1) {
                categories.push(data[i].r);
            }
        }
    }
    return categories;
}

function checkCount() {
    var checked = [];
    if(document.getElementById('e1').checked) { checked.push("e1"); }
    if(document.getElementById('e2').checked) { checked.push("e2"); }
    if(document.getElementById('e3').checked) { checked.push("e3"); }
    if(document.getElementById('e4').checked) { checked.push("e4"); }
    if(document.getElementById('e5').checked) { checked.push("e5"); }
    if(document.getElementById('e6').checked) { checked.push("e6"); }
    return checked;
}

function getPts(x) {
    var unfiltered = [];
    x.forEach(function (d, i) {
        unfiltered[i] = {
            e1: +d[1],
            e2: +d[2],
            e3: +d[3],
            e4: +d[4],
            e5: +d[5],
            e6: +d[6],
            r: d[d.length - 1],
            id: d[0]
        };
    });
    return unfiltered;
}

function select_eigs(data) {
    eig_arr = checkCount();
    var filtered = [];
    data.forEach(function(d, i) {
        filtered[i] = {
            x: d[eig_arr[0]],
            y: d[eig_arr[1]],
            z: d[eig_arr[2]],
            r: d.r,
            i: i,
            state: "on", // "on", "off", "gray"
            id: d.id
        };
    });
    return filtered;
}

var color_set = ["#02011b", "#1eff06", "#2401fe", "#ff1902", "#1ffefe", "#fea0ff", "#898105", "#98043d", "#022e9d", "#fddccc", "#0dacff", "#fcff04", "#fe08fb", "#046b52", "#a2fe94", "#ff9303", "#856985", "#4e2901", "#ff04a1", "#018502", "#fd8771", "#840176", "#feec89", "#9555ff", "#ff0155", "#79b2bc", "#a42203", "#8f835f", "#87d607", "#7f88fe", "#d1c8ff", "#13bf8c", "#02427e", "#0a2002", "#c5fed5", "#f572a2", "#4a0232", "#e5bd07", "#315201", "#a66526", "#04f86e", "#8ab265", "#0102b2", "#214a57", "#d44cd4", "#0f0146", "#a55a56", "#9b64b2", "#ffb46a", "#e6a3ba", "#dffe6a", "#fd6b31", "#ac02ff", "#027da8", "#4a3034", "#7c01a7", "#0cfead", "#0bd2ff", "#7fa91c", "#d6f3ff", "#0263fc", "#680204", "#9c4473", "#7a88c8", "#2dc45e", "#da9d81", "#248542", "#bc1474", "#cec189", "#68a888", "#c28808", "#02b708", "#4a503b", "#695815", "#d5414b", "#57326f", "#9357d1", "#ada0a1", "#fe68c9", "#0267c6", "#3c0103", "#0f42ff", "#ff3a83", "#6dfed2", "#ff0ece", "#0cbebc", "#bea2fa", "#470170", "#ddffaa", "#da0822", "#bbc703", "#05818a", "#bb20dd", "#7fb9ea", "#b2cab4", "#65787b", "#597846", "#bb964b", "#bdbb47", "#c96701", "#79ff4b", "#322f4e", "#73273a", "#da85c0", "#93e9e4", "#fefcca", "#c8fe0a", "#53811d", "#8bde9c", "#7d5f57", "#343401", "#1a0f01", "#b55136", "#5036c7", "#c20498", "#fedbf3", "#5a4ca8", "#acd767", "#b84a9e", "#7ad751", "#014319", "#e4818a", "#febcf8", "#7a3405", "#ffee57", "#495c81", "#b795c3", "#7802ce", "#845633", "#d982ff", "#f9c858", "#012224", "#8391b0", "#21062f", "#fd8e51", "#868840", "#26018b", "#054438", "#022978", "#c04d6b", "#790252", "#663b5b", "#61ad45", "#b47086", "#729efe", "#9a0420", "#325cd4", "#b6c1d9", "#270316", "#ff6e82", "#fe5c4d", "#635b9b", "#b2d39b", "#1e6eb0", "#91dffb", "#016302", "#07a4c3", "#ca044f", "#ffcb97", "#ff57ff", "#753326", "#feb228", "#7cd8b6", "#813a9b", "#560358", "#859885", "#b0fe60", "#4fa703", "#c4d07b", "#ffe304", "#9aff02", "#b2837c", "#0e936d", "#cc64ff", "#58525e", "#b59d03", "#d13501", "#846dff", "#d48157", "#021e51", "#3d2e19", "#6e27fd", "#7d77cf", "#66ff8e", "#f8ffee", "#8b6704", "#90a270", "#07d908", "#9f22a4", "#ffb8b2", "#ad7de5", "#c9b299", "#5ab36c", "#a1373e", "#a14501", "#5f6904", "#0e89fd", "#a5d339", "#ad8053", "#823379", "#88578a", "#622ca3", "#d371d3", "#e5c371", "#50755f", "#f04b9c", "#9ab5fb", "#45dff0", "#64e48f", "#f19a3a", "#d1552a", "#899c37", "#06d3b8", "#854e5c", "#ff7cf4", "#3d5224", "#099b41", "#dbf133", "#07afe9", "#333835", "#fe5203", "#06978a", "#fe7605", "#c9508d", "#e3f482", "#d1615e", "#81fd6e", "#5d4b26", "#6e4501", "#4a93d0", "#f244c6", "#040b67", "#fd97bf", "#d40bc9", "#9841d5", "#d5d4d2", "#236429", "#dfbbc0", "#0f04d7", "#346d81", "#0eff51", "#013e64", "#fb456b", "#20d24e", "#0588e0", "#ffaa7f", "#256361", "#ce8a3d", "#85d476", "#633d30", "#03263b", "#d63973", "#ff472d", "#b2ab57", "#16e7ae", "#ffe6a3", "#b48ea2", "#9e1e5b", "#72c1b6", "#9ea802", "#cdfef1", "#d5023a", "#d30efa", "#59938c", "#5e9962", "#4c1729", "#4a287c", "#902914", "#fd81c8", "#c1fd7e", "#730323", "#4c50f5", "#8a8075", "#bc88cd", "#fc9d8f", "#03a828", "#cc7b6b", "#311301", "#a93afb", "#cb6d32", "#5993ac", "#251f28", "#b1609d", "#64da36", "#d2d94e", "#72254f", "#9076b0", "#d0b6d5", "#710689", "#564672", "#ae50be", "#92fee6", "#cbab43", "#dfd8b5", "#5202aa", "#21499c", "#686836", "#390f4b", "#401d3b", "#a7d4d7", "#7966d4", "#ab9a62", "#a96243", "#d16f96", "#dda66d", "#9e1e75", "#78043c", "#bd1e24", "#698b42", "#a4a8d8", "#4e2bdb", "#d34ebb", "#ddc73f", "#8bffba", "#aedc8b", "#501602", "#fb7651", "#5f4cca", "#927635", "#b16c01", "#ac7cfe", "#3fb695", "#bdfeba", "#e60381", "#508e01", "#81bf89", "#9a455a", "#39a7af", "#a902b6", "#587ca9", "#fff3fa", "#fa6a66", "#01b56b", "#8a818e", "#ab759f", "#193203", "#2e593c", "#e633a4", "#8499a0", "#57e3d9", "#b2d8ff", "#0576fe", "#fa872f", "#d2aded", "#dfe8a5", "#444b03", "#fd0126", "#67f802", "#0cfde6", "#475856", "#a9871f", "#b9ef35", "#fd3647", "#d25404", "#dba926", "#dedcfe", "#6f654b", "#308528", "#59c4db", "#020a30", "#2d361a", "#724a95", "#96725a", "#d89495", "#07e384", "#0a47ce", "#468664", "#f0bfa5", "#6de173", "#d3ecce", "#323270", "#574841", "#bd344f", "#562221", "#1746ad", "#e5a847", "#ffa3e9", "#ffc3e6", "#99f5c4", "#536fbc", "#986e78", "#d393ef", "#5b1e54", "#79759f", "#aab9b9", "#b3ba93", "#61dcab", "#decf15", "#0b598b", "#63738b", "#8bb64f", "#e09fcd", "#71e307", "#370258", "#523c01", "#5a9b49", "#fc5d8c", "#7bba04", "#a8e0c8", "#f40363", "#bb5de0", "#ef6efe", "#56021e", "#566a26", "#d85846", "#a797da", "#a8c13e", "#ab2a96", "#925cc0", "#738461", "#6e8c04", "#029d62", "#b59275", "#fb83e0", "#7fbf41", "#fea2b0", "#a4fa3a", "#3c2654", "#313949", "#e3cc61", "#fffa43", "#661677", "#953f2e", "#7734d7", "#197749", "#945779", "#82693e", "#d93e29", "#d76ebb", "#e29201", "#94bd99", "#abba78", "#2fe446", "#1d2418", "#041eb0", "#df0f03", "#5772dc", "#da4ea4", "#88adc8", "#bcf692", "#8b35b3", "#7d7018", "#034904", "#7d41fd", "#dc50fe", "#fdfea9", "#be6371", "#f604b3", "#9696fa", "#d3a69b", "#c01cb1", "#cdab7e", "#0a5676", "#b70301", "#8bb4a9", "#277c70", "#a9a2ba", "#030139", "#311686", "#4d394e", "#875346", "#b23833", "#a664f7", "#fa21e6", "#ff58e9", "#fff879", "#b20254", "#6a70f1", "#defdc4", "#010d12", "#211630", "#05361c", "#703b18", "#9114c6", "#417a2e", "#a39b84", "#f87f80", "#ecadfc", "#7cffff", "#b80937", "#ffddb5", "#570191", "#bc3fd9", "#e56d87", "#52bb46", "#6bb3f8", "#653340", "#112bfe", "#844143", "#de724e", "#439cc8", "#ec975c", "#6ecffc", "#9af675", "#b1f3fe", "#8b5f25", "#4a349b", "#694a53", "#566643", "#696561", "#9f4f21", "#53669d", "#9c4b9f", "#e2496a", "#9e8e35", "#e3702e", "#5bce8b", "#f4cdfe", "#2e1718", "#8e2741", "#773a6b", "#7b4fe3", "#b34af4", "#aa7b2f", "#6397e4", "#ce85a8", "#56c36b", "#a8b957", "#601217", "#884a02", "#50848d", "#7897c9", "#9e9d23", "#beb407", "#08d38a", "#add204", "#c7d467", "#ffc1cf", "#ffd247", "#042448", "#356503", "#abc7fe", "#281b60", "#153a3a", "#661e02", "#4d438d", "#625774", "#db0ee4", "#b77e66", "#f84d59", "#9a87a7", "#4cc02f"]