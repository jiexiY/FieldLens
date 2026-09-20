// Preserve old bookmarked sections while the bare domain opens the product intro.
const legacy={overview:'/plan','voice-assistant':'/talk',transit:'/bus',method:'/sources',results:'/conditions'};
const destination=legacy[location.hash.slice(1)];if(destination)location.replace(destination);
