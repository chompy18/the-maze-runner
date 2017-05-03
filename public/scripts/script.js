$(document).ready(function(){
  $('#terminal').bgTerminal({
    url: '../index.txt', // The page to load and display in the terminal
    glow: true, // If true, the terminal will have a glowing effect
    speed: 100, // Type speed in milliseconds. This is the time between two character are typed
    wait: 1000 // The number of milliseconds to wait at the end of the line (when \n is found)
  });
});