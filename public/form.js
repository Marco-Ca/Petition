let clear = $('#clear');

function erase() {
    $('input').val('');
}

clear.on('click', erase);
