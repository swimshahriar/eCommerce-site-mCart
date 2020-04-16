// jshint esversion:6

$(document).ready(function () {
  $("#bkash-check").hide();
  $('input[type="radio"]').click(function () {
    let inputValue = $(this).attr("value");

    if (inputValue === "Bkash") {
      $("#bkash-check").show();
      $("#bkashNumber").prop("required", true);
      $("#bkashTrxID").prop("required", true);
    } else {
      $("#bkash-check").hide();
      $("#bkashNumber").prop("required", false);
      $("#bkashTrxID").prop("required", false);
    }
  });
});
