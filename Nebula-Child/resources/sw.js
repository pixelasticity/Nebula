//BEGIN automated edits. These will be automatically overwritten.
const THEME_NAME = 'nebula-child';
const NEBULA_VERSION = 'v8.11.11.975'; //Sunday, April 11, 2021 11:23:25 PM
const OFFLINE_URL = 'https://nebula.gearside.com/offline/';
const OFFLINE_IMG = 'https://nebula.gearside.com/wp-content/themes/Nebula-main/assets/img/offline.svg';
const OFFLINE_GA_DIMENSION = 'cd2';
const META_ICON = 'https://nebula.gearside.com/wp-content/themes/Nebula-main/assets/img/meta/android-chrome-512x512.png';
const MANIFEST = 'https://nebula.gearside.com/wp-content/themes/Nebula-main/inc/manifest.json';
const HOME_URL = 'https://nebula.gearside.com/';
//END automated edits

importScripts('https://cdnjs.cloudflare.com/ajax/libs/workbox-sw/6.1.2/workbox-sw.min.js'); //Do not forget to update Workbox Window in the optmization.js module
workbox.setConfig({debug: false}); //https://developers.google.com/web/tools/workbox/guides/troubleshoot-and-debug
//The Service Worker console can be inspected by visiting chrome://inspect/#service-workers

self.skipWaiting();
workbox.core.clientsClaim();
workbox.precaching.cleanupOutdatedCaches(); //This listens for "-precache-" in the cache name. I am not sure if this is working...

//deleteCacheAndMetadata(); //I do not think this is a thing anymore... https://developers.google.com/web/tools/workbox/reference-docs/latest/workbox.expiration.Plugin.html#deleteCacheAndMetadata

//Cache names
workbox.core.setCacheNameDetails({
	prefix: THEME_NAME,
	suffix: NEBULA_VERSION,
	precache: 'precache',
	runtime: 'runtime',
	googleAnalytics: 'ga'
});

//Precache files on SW install
const revisionNumber = NEBULA_VERSION.replaceAll(/v|\./g, ''); //Remove "v" and periods in version number
workbox.precaching.precacheAndRoute([
	{url: OFFLINE_URL, revision: revisionNumber},
	{url: OFFLINE_IMG, revision: revisionNumber},
	{url: META_ICON, revision: revisionNumber},
	{url: MANIFEST, revision: revisionNumber},
	{url: HOME_URL, revision: revisionNumber},
]);

//Ignore query strings
const ignoreQueryStringPlugin = {
	cachedResponseWillBeUsed: async({cacheName, request, matchOptions, cachedResponse, event}) => {
		if ( cachedResponse ){
			return cachedResponse; //Return the cached response if an exact match is found
		}

		return caches.match(request.url, {ignoreSearch: true}); //Try finding a match without query strings this time
	}
};

//Check if we need to force network retrieval for specific resources (false = network only, true = allow caching)
//Note: When this returns false, no catch handler will be used (so no offline file replacement)
function isCacheAllowed(event){
	if ( event.request ){ //Use event.request for non-Workbox requests (just in case)
		event = event.request;
	}

	if ( event.method !== 'GET' ){ //Prevent cache for POST and AJAX requests (Workbox may already handle this, but just to be safe)
		return false;
	}

	let eventReferrer = event.referrer; //The page making the request
	let eventURL = event.url.href || event.url; //The file being requested

	//Check domains, directories, and pages
	let pageRegex = /\/chrome-extension:\/\/|\/wp-login.php|\/wp-admin|\/wp-json|analytics|hubspot|hs-scripts|customize.php|customize_|no-cache|admin-ajax|gutenberg\//;
	if ( pageRegex.test(eventReferrer) || pageRegex.test(eventURL) ){
		return false;
	}

	//Check file extensions
	let fileRegex = /\.(?:pdf|docx?|xlsx?|pptx?|zipx?|rar|tar|txt|rtf|ics|vcard)/;
	if ( fileRegex.test(eventReferrer) || fileRegex.test(eventURL) ){
		return false;
	}

	return true;
}

//Data feeds
workbox.routing.registerRoute(
	new RegExp('/(?:json|xml|yaml|csv)/'), //Not just extensions so endpoints like /wp-json/ are included
	new workbox.strategies.NetworkFirst()
);

//Search Results
workbox.routing.registerRoute(
	function(event){
		return event.url.href.includes('?s=');
	},
	new workbox.strategies.NetworkOnly()
);

//Images
workbox.routing.registerRoute(
	new RegExp('/.(?:png|gif|jpg|jpeg|webp|svg)$/'),
	new workbox.strategies.StaleWhileRevalidate({
		cacheName: 'images', //This cache name is used for the offline fallback and expiration plugin
		plugins: [
			new workbox.expiration.ExpirationPlugin({
				maxEntries: 100, //Cache a maximum number of resources (Figure out a reasonable amount here...)
				maxAgeSeconds: 7 * 24 * 60 * 60, //Cache for a maximum of a week
				purgeOnQuotaError: true //Purge if an error occurs
			}),
			ignoreQueryStringPlugin
		]
	})
);

//Everything else (not using setDefaultHandler() to avoid caching certain requests)
workbox.routing.registerRoute(
	isCacheAllowed, //Avoid caching certain requests
	new workbox.strategies.StaleWhileRevalidate({
		cacheName: 'default', //Cache name is required for expiration plugin
		plugins: [
			new workbox.expiration.ExpirationPlugin({
				maxEntries: 250, //Cache a maximum of 250 resources (Figure out a reasonable amount here...)
				maxAgeSeconds: 30 * 24 * 60 * 60, //Cache for a maximum of a month
				purgeOnQuotaError: true //Purge if an error occurs
			}),
			new workbox.broadcastUpdate.BroadcastUpdatePlugin(), //yolo May only want to do this for significant resources
			ignoreQueryStringPlugin
		]
	})
);

//Offline response
workbox.routing.setCatchHandler(function(params){
	if ( params.event.request.mode === 'navigate' ){
		return caches.match(workbox.precaching.getCacheKeyForURL(OFFLINE_URL));
	}

	if ( params.event.request.destination === 'image' ){
		return caches.match(workbox.precaching.getCacheKeyForURL(OFFLINE_IMG));
	}

	return Response.error(); //If we do not have a fallback, just return an error response.
});

//Offline Google Analytics: https://developers.google.com/web/tools/workbox/modules/workbox-google-analytics
//Noticing some strange (not set) Language traffic in GA... currently testing this before bringing it back.
workbox.googleAnalytics.initialize({
	parameterOverrides: {
		[OFFLINE_GA_DIMENSION]: 'offline', //Set a custom dimension to note offline hits (if set in Nebula Options)
	},
});

//Handle messages from the window
addEventListener('message', function(event){
	//This is an example message
	if ( event.data.type === 'GET_VERSION' ){ //Check the incoming message for a specific word/phrase/handle
		return event.ports[0].postMessage(revisionNumber); //Reply to the window
	}
});