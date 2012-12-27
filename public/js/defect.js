/**
 * © Adan Perez 2012
 */

/**
 * Add custom method to Raphael
 * @return {Boolean}
 */
Raphael.el.isVisible = function() {
	return (this.node.style.display !== "none");
}

/**
 * Defect Circle Manager
 */
var defects = function() {

	var init = false,
		circles = {};

	var getArcPath = function (value, total, radius, xOriginPos, yOriginPos) {
		var degrees = total ? ((360 / total) * value) : 0,
				//radian = Math.PI / 180, // degrees = radians * (180/pi)
				radians = ((90 - degrees) * Math.PI) / 180, // shifting starting degrees 90 degrees
				x = radius * Math.cos(radians),
				y = radius * Math.sin(radians);

		if (total == value) {
			x = xOriginPos - 0.001;
			y = yOriginPos - radius;
		} else {
			x = xOriginPos + x;
			y = yOriginPos - y;
		}

		var path = [["M", xOriginPos, yOriginPos - radius], ["A", radius, radius, 0, +(degrees > 180), 1, x, y]];
		console.log(path);
		return {path:path};
	};

	var init = function() {
		circles['redDefects'] = createDefectCircle('redDefects', 400, 400, 200, 200, 140, 170, '#FF0000');
		circles['yellowDefects'] = createDefectCircle('yellowDefects', 400, 400, 200, 200, 140, 170, '#FFFF00');
		circles['greenDefects'] = createDefectCircle('greenDefects', 400, 400, 200, 200, 140, 170, '#00CC66');

		circles['redDefects'].circle.animate({opacity:1}, 600, function() {
			circles['yellowDefects'].circle.animate({opacity:1}, 600, function() {
				circles['greenDefects'].circle.animate({opacity:1}, 600, function() {});
			});
		});
		init = true;
	}

	function createDefectCircle(id, width, height, x, y, radius, arcRadius, color) {
		var fontAttr = {fill: '#FFFFFF', 'font-size':40, "font-family": 'Chau Philomene One, sans-serif'},
			circleAttr = {'stroke-width':1, "fill": color, "fill-opacity": 0.4, 'stroke':'#111111', opacity:0},
			arcAttr ={stroke: color, "stroke-width": 30, 'stroke-linecap': 'square'},
			circle = {};

		circle.raphael = Raphael(id, width, height);
		circle.raphael.customAttributes.arc = getArcPath;
		circle.circle = circle.raphael.circle(x, y, radius).attr(circleAttr);
		circle.defectsOpenText =  circle.raphael.text(x, y, '').attr(fontAttr);
		fontAttr['font-size'] = 20;
		circle.defectsClosedText = circle.raphael.text(x, y + 50, '').attr(fontAttr);

		circle.arcPath = circle.raphael.path().attr(arcAttr).attr({arc:[0, 1, arcRadius, x, y]});//
		circle.arcPath.attr({path:['M', x, y - arcRadius]});
		//circle.arcPath.animate({arc:[0, 0, arcRadius, x, y]}, 700, "bounce")

		return circle;
	}

	var updateCircle = function(id, open, total) {
		circles[id].defectsOpenText.attr('text', open + ' Defects');
		circles[id].defectsClosedText.attr('text', (total - open) + ' Closed');

		if (open == 0) {
			circles[id].arcPath.animate({arc:[0, 1, 170, 200, 200]}, 500, function() {
				circles[id].arcPath.attr({path:['M', 200, 30]});
				circles[id].arcPath.hide();
			});
		} else {
			if (!circles[id].arcPath.isVisible()) {
				circles[id].arcPath.attr({arc:[0, 1, 170, 200, 200]}); // need this line to help animation. Sorta goofy. bug?
				circles[id].arcPath.show();
			}
			circles[id].arcPath.animate({arc:[open, total, 170, 200, 200]}, 800, "bounce", function() {});
		}
	}

	var draw = function(data) {
		updateCircle('redDefects', data.redOpen, data.redTotal);
		updateCircle('yellowDefects',  data.yellowOpen, data.yellowTotal);
		updateCircle('greenDefects',  data.greenOpen, data.greenTotal);
	}

	return {
		init: init,
		drawCircles: draw
	}
}();

var timeout;

function lookupDefects() {
    clearTimeout(timeout);
    timeout = setTimeout(lookupDefects, 60000 * 5);

    var release = $('#release').val();
    //$('#graphs').hide();
    $('div.loader').show();
    $('#title').html('Loading...');

    $.ajax({
        type: "GET",
        url: "/info",
        dataType: "json",
        data: { release: release }
    }).done(function(json) {
            $('div.loader').fadeOut(200, function() {
                $('#graphs').show();
                $('#title').html(release);
                var percent = (json.storyComplete / json.storyTotal);
                percent = Math.floor(percent * 100);
                $('.meter span').animate({width: percent + '%'});
                $('#graphs h4').html(percent + '% Complete: ' + json.storyComplete + ' of ' + json.storyTotal + ' stories.');
                defects.drawCircles(json);
            });
        });
}

$('#reload').click(function(e) {
    e.preventDefault();
    lookupDefects();
});
$('#release').change(function() {
    lookupDefects();
})
$(document).ready(function() {
    defects.init();
    lookupDefects();
});