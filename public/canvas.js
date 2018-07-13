var canvas = document.getElementById('sigCanvas'),
    canv = $("#sigCanvas"),
    ctx = document.getElementById('sigCanvas').getContext("2d");

var clickX = new Array();
var clickY = new Array();
var clickDrag = new Array();
var paint;

canvas.addEventListener("mousedown", mouseDown, false);
canvas.addEventListener("mousemove", mouseXY, false);
document.body.addEventListener("mouseup", mouseUp, false);

//For mobile
canvas.addEventListener("touchstart", mouseDown, false);
canvas.addEventListener("touchmove", mouseXY, true);
canvas.addEventListener("touchend", mouseUp, false);
document.body.addEventListener("touchcancel", mouseUp, false);

$("#clear").on("click", function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    clickX = new Array();
    clickY = new Array();
    clickDrag = new Array();
});

function draw() {
    ctx.strokeStyle = "#000000";
    ctx.lineJoin = "miter";
    ctx.lineWidth = 2;

    for (var i = 0; i < clickX.length; i++) {
        ctx.beginPath();
        if (clickDrag[i] && i) {
            ctx.moveTo(clickX[i - 1], clickY[i - 1]);
        } else {
            ctx.moveTo(clickX[i] - 1, clickY[i]);
        }
        ctx.lineTo(clickX[i], clickY[i]);
        ctx.stroke();
        ctx.closePath();
    }
}

function addClick(x, y, dragging) {
    clickX.push(x);
    clickY.push(y);
    clickDrag.push(dragging);
}

function mouseDown(e)
{
    paint = true;
    addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
    draw();
}

function mouseUp() {
    var sig = canvas.toDataURL();
    $('#hiddenSig').val(sig);
    paint = false;
}

function mouseXY(e) {
    if (paint) {
        addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, true);
        draw();
    }
}
