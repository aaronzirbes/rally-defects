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
		teams = [],
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
		return {path:path};
	};

	var init = function(teamsToInit) {
		teams = teamsToInit;
		circles['total'] = createDefectCircle('total', 500, 500, 250, 250, 180, 220, '#FF0000');
		init = true;
	}

	function createDefectCircle(id, width, height, x, y, radius, arcRadius, color) {
		var fontAttr = {fill: '#FFFFFF', 'font-size':120, "font-family": 'Chau Philomene One, sans-serif'},
				circleAttr = {'stroke-width':1, "fill": color, "fill-opacity": 0.4, 'stroke':'#111111', opacity:1},
				arcAttr ={stroke: color, "stroke-width": 40, 'stroke-linecap': 'square'},
				circle = {};

		circle.raphael = Raphael(id, width, height);
		circle.raphael.customAttributes.arc = getArcPath;
		circle.circle = circle.raphael.circle(x, y, radius).attr(circleAttr);
		circle.defectsOpenText = circle.raphael.text(x, y - 55, '').attr(fontAttr);
		fontAttr['font-size'] = 35;
		circle.defectsTitleText =  circle.raphael.text(x, y + 25, '').attr(fontAttr);
		fontAttr['fill'] = '#F0CC00';
		circle.defectsClosedText = circle.raphael.text(x, y + 75, '').attr(fontAttr);

		circle.arcPath = circle.raphael.path().attr(arcAttr).attr({arc:[0, 1, arcRadius, x, y]});//
		circle.arcPath.attr({path:['M', x, y - arcRadius]});
		return circle;
	}

	var updateCircle = function(id, teamName, open, total) {
		circles[id].defectsTitleText.attr('text', teamName);
		circles[id].defectsOpenText.attr('text', open);
		circles[id].defectsClosedText.attr('text', total - open + ' Closed');

		if (open == 0) {
			circles[id].arcPath.animate({arc:[0, 1, 220, 250, 250]}, 500, function() {
				circles[id].arcPath.attr({path:['M', 250, 30]});
				circles[id].arcPath.hide();
			});
		} else {
			if (!circles[id].arcPath.isVisible()) {
				circles[id].arcPath.attr({arc:[0, 1, 220, 250, 250]}); // need this line to help animation. Sorta goofy. bug?
				circles[id].arcPath.show();
			}
			circles[id].arcPath.animate({arc:[open, total, 220, 250, 250]}, 800, "bounce", function() {});
		}
	}

    var addErrorToTotalCircle = function(error) {
        circles['total'].defectsOpenText.attr('text', 'Error!');
        circles['total'].defectsClosedText.attr('text', error);
    }

	var draw = function(data) {
		var totalDefectsOpen = 0;
		for (var i = 0; i < teams.length; i++) {
			totalDefectsOpen += data[teams[i].key];
		}
		updateCircle('total', 'Open Defects', totalDefectsOpen, data.total);
	}

	return {
		init: init,
		drawCircles: draw,
        addErrorToTotalCircle: addErrorToTotalCircle
	}
}();



var timeout;

function lookupDefects() {
    clearTimeout(timeout);
    timeout = setTimeout(lookupDefects, 60000 * 5);

    var release = $('#release').val();
    //$('#graphs').hide();
    $('div.loader').show();
    $('#title').html('Loading');

    $.ajax({
        type:"GET",
        url:"/teamInfo",
        dataType:"json",
        data:{ teams:teams, release:release }
    }).done(function (json) {
        $('div.loader').fadeOut(200, function () {
            $('#graphs').show();
            $('#title').html(release);

            if (json.error) {
                fail(json.error);
            } else {
                success(json);
            }
        });
    });
}

function success(json) {
    var totalDefectsOpen = 0;
    for (var i = 0; i < teams.length; i++) {
        totalDefectsOpen += json[teams[i].key];
    }

    for (var i = 0; i < teams.length; i++) {
        (function () {
            var defectsOpen = json[teams[i].key];
            var id = 'defectsFor' + teams[i].key;
            var numId = 'number' + teams[i].key;
            var percent = totalDefectsOpen > 0 ? (defectsOpen / totalDefectsOpen) : 0;
            percent = Math.floor(percent * 100);
            $('#' + id + ' span').animate({width:percent + '%'}, 500, function () {
                $('#' + numId).html(defectsOpen > 0 ? defectsOpen : '');
            });
        })();
        var percent = (json.storyComplete / json.storyTotal);
        percent = Math.floor(percent * 100);
        $('.releaseInfo .meter span').animate({width:percent + '%'});
        $('.releaseInfo h4').html(percent + '% Complete: ' + json.storyComplete + ' of ' + json.storyTotal + ' stories.');
    }
    defects.drawCircles(json);
}

function fail(message) {
   defects.addErrorToTotalCircle(message)
}

$('#reload').click(function (e) {
    e.preventDefault();
    lookupDefects();
});
$('#release').change(function () {
    lookupDefects();
})
$(document).ready(function () {
    defects.init(teams);
    lookupDefects();
});