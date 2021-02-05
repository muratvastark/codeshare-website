$(window).on("load", function () {
    $(".preloader").fadeOut("slow");
});

const doFade = () => {
    $(`#copyied`)
        .fadeIn("slow")
        .delay(600)
        .fadeOut("slow")
};

function goBack() {
    window.history.back();
}
