d3.csv("auto_inbreed.evec", function (error, dataset) {
    if (error) throw error;

    // var scatterPlot = new THREE.Object3D();
    // scene.add(scatterPlot);
    //
    // scatterPlot.rotation.y = 0;

    var unfiltered = [];
    dataset.forEach(function (d, i) {
        unfiltered[i] = {
            x: +d.x,
            y: +d.y,
            z: +d.z,
            r: d.group
        };
    });

    var xExent = d3.extent(unfiltered, function (d) {return d.x; }),
        yExent = d3.extent(unfiltered, function (d) {return d.y; }),
        zExent = d3.extent(unfiltered, function (d) {return d.z; });

    var xScale = d3.scale.linear()
        .domain(xExent)
        .range([-50,50]);
    var yScale = d3.scale.linear()
        .domain(yExent)
        .range([-50,50]);
    var zScale = d3.scale.linear()
        .domain(zExent)
        .range([-50,50]);

    var pointCount = unfiltered.length;

    var categories = [];
    for (i=0; i<pointCount; i++) {
        var group = unfiltered[i].r;
        if (categories.indexOf(group) == -1) {
            categories.push(unfiltered[i].r);
        }
    }

    var color = d3.scale.ordinal()
        .domain(categories)
        .range(color_set);

    var PI2 = Math.PI * 2;
    var material = new THREE.SpriteCanvasMaterial( {

        color: 0xffffff,
        program: function ( context ) {

            context.beginPath();
            context.arc( 0, 0, 0.5, 0, PI2, true );
            context.fill();

        }

    } );

    for (var i=0; i<pointCount; i++) {
        var x = xScale(unfiltered[i].x);
        var y = yScale(unfiltered[i].y);
        var z = zScale(unfiltered[i].z);
        group = unfiltered[i].r;

        var particle = new THREE.Sprite(material);
        particle.position.x = x;
        particle.position.y = y;
        particle.position.z = z;

        scene.add(particle);
    }

    // var mat = new THREE.PointsMaterial({
    //     vertexColors: true,
    //     size: 10
    // });
    //
    // var particles = new THREE.Geometry();
    // for (var i = 0; i < pointCount; i ++) {
    //     var x = xScale(unfiltered[i].x);
    //     var y = yScale(unfiltered[i].y);
    //     var z = zScale(unfiltered[i].z);
    //     group = unfiltered[i].r;
    //
    //     particles.vertices.push(new THREE.Vector3(x, y, z));
    //     particles.colors.push(new THREE.Color().set(color(group)));
    // }
    //
    // var points = new THREE.Points(particles, mat);
    // // scatterPlot.add(points);
});