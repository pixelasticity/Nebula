window.performance.mark('(Nebula) Inside /modules/helpers.js');

//Miscellaneous helper classes and functions
nebula.helpers = async function(){
	if ( typeof window.ga !== 'function' ){
		window.ga = function(){}; //Prevent ga() calls from erroring if GA is off or blocked. This is supplemental to a similar check in analytics.php
	}

	//Remove Sass render trigger query
	if ( nebula.get('sass') && !nebula.get('persistent') ){
		window.history.replaceState({}, document.title, nebula.removeQueryParameter('sass', window.location.href));
	}

	//Empty caches when debugging
	if ( nebula.get('debug') || nebula.dom.html.hasClass('debug') ){
		nebula.emptyCaches(); //Clear the caches
	}

	nebula.dom.html.removeClass('no-js').addClass('js');
	jQuery("a[href^='http']:not([href*='" + nebula.site.domain + "'])").attr('rel', 'nofollow external noopener'); //Add rel attributes to external links. Although search crawlers do use JavaScript, don't rely on this line to instruct them. Use standard HTML attributes whenever possible.

	//Note the level of RAM available for a "lite" or "full" experience
	if ( 'deviceMemory' in navigator ){ //Device Memory - Chrome 64+
		let deviceMemoryLevel = ( navigator.deviceMemory < 1 )? 'lite' : 'full'; //Possible values (GB of RAM): 0.25, 0.5, 1, 2, 4, 8
		nebula.dom.html.addClass('device-memory-' + deviceMemoryLevel);
	}

	//Remove filetype icons from images within <a> tags and buttons. Note: these contribute to CLS because they are not animations
	jQuery('a img').closest('a').addClass('no-icon');
	jQuery('.no-icon:not(a)').find('a').addClass('no-icon');

	jQuery('span.nebula-code').parent('p').css('margin-bottom', '0px'); //Fix for <p> tags wrapping Nebula pre spans in the WYSIWYG

	//Maintain tab navigability on hashchange (and when loaded with a hash). This also helps accessibility for things like skip to content links
	if ( document.location.hash ){
		nebula.focusOnElement(jQuery(document.location.hash));
	}

	//If the hash has been changed (activation of an in-page link)
	nebula.dom.window.on('hashchange', function(){
		let hash = window.location.hash.replace(/^#/, '');
		if ( hash ){ //If the hash is not empty (like when clicking on an href="#" link)
			nebula.focusOnElement(jQuery('#' + hash));
		}
	});

	//Change the Bootstrap label for custom file upload inputs on upload
	jQuery('input[type="file"].custom-file-input').on('change', function(){
		if ( jQuery(this).parents('.custom-file').find('.custom-file-label').length ){
			let fileName = jQuery(this).val().split('\\').pop(); //Get the filename without the full path
			jQuery(this).parents('.custom-file').find('.custom-file-label').text(fileName);
		}
	});

	//Deactivate potential active states when the escape key is pressed
	nebula.dom.document.on('keydown', function(e){
		if ( e.key === 'Escape' ){
			nebula.dom.document.trigger('esc'); //Trigger a simpler DOM event. Is this helpful?

			//Close modals
			jQuery('.modal').modal('hide');
		}
	});

	//Nebula preferred default Chosen.js options
	nebula.chosenOptions = wp.hooks.applyFilters('nebulaChosenOptions', {
		disable_search_threshold: 5,
		search_contains: true,
		no_results_text: 'No results found.',
		allow_single_deselect: true,
		width: '100%'
	});

	nebula.dragDropUpload();
};

//Sub-menu viewport overflow detector
nebula.overflowDetector = async function(){
	if ( jQuery('.sub-menu').length ){ //Only add the event listener if sub-menus actually exist
		jQuery('.menu li.menu-item').on({
			'mouseenter focus focusin': function(){
				if ( jQuery(this).children('.sub-menu').length ){ //Check if this menu has sub-menus
					let submenuLeft = jQuery(this).children('.sub-menu').offset().left; //Left side of the sub-menu
					let submenuRight = submenuLeft+jQuery(this).children('.sub-menu').width(); //Right side of the sub-menu

					if ( submenuRight > nebula.dom.window.width() ){ //If the right side is greater than the width of the viewport
						jQuery(this).children('.sub-menu').addClass('overflowing overflowing-left');
					} else if (submenuLeft > nebula.dom.window.width() ) {
						jQuery(this).children('.sub-menu').addClass('overflowing overflowing-right');
					} else {
						jQuery(this).children('.sub-menu').removeClass('overflowing overflowing-left overflowing-right');
					}
				}
			},
			'mouseleave': function(){
				jQuery(this).children('.sub-menu').removeClass('overflowing');
			}
		});
	}
};

//Enable drag and drop uploading for Contact Form 7 file inputs
nebula.dragDropUpload = async function(){
	if ( jQuery('.nebula-drop-area').length ){
		//Activate drag and drop listeners for each drop area class on the page
		document.querySelectorAll('.nebula-drop-area').forEach(function(dropArea){
			let thisEvent = {
				category: 'Drag and Drop File Upload',
				formID: jQuery(dropArea).closest('form').attr('id') || 'form.' + jQuery(dropArea).closest('form').attr('class').replace(/\s/g, '.'),
				fileInputID: jQuery(dropArea).find('input[type="file"]').attr('id'),
			};

			//Drag over
			dropArea.addEventListener('dragover', function(e){ //This gets called every frame of the hover... Can we throttle it without causing a problem?
				e.stopPropagation();
				e.preventDefault();

				jQuery(dropArea).addClass('dragover');
				e.dataTransfer.dropEffect = 'copy'; //Visualize to the user the "copy" cursor

				nebula.debounce(function(){
					thisEvent.action = 'Drag Over';
					nebula.dom.document.trigger('nebula_event', thisEvent);
					ga('send', 'event', thisEvent.category, thisEvent.action, thisEvent.fileInputID);
				}, 500, 'file drag over');
			});

			//Drag out
			dropArea.addEventListener('dragleave', function(e){
				jQuery(dropArea).addClass('dragover');

				thisEvent.action = 'Drag Leave';
				nebula.dom.document.trigger('nebula_event', thisEvent);
				ga('send', 'event', thisEvent.category, thisEvent.action, thisEvent.fileInputID);
			});

			//Drop
			dropArea.addEventListener('drop', function(e){
				e.stopPropagation();
				e.preventDefault();

				jQuery(dropArea).removeClass('dragover');

				let fileInput = dropArea.querySelectorAll('input[type="file"]')[0]; //Find the file input field within this drop area
				let acceptedFiles = jQuery(fileInput).attr('accept').replaceAll(/\s?\./g, '').split(',');
				let thisFileType = e.dataTransfer.files[0].type.replace(/\S+\//, '');

				thisEvent.fileType = thisFileType;
				thisEvent.file = e.dataTransfer.files[0];

				if ( !jQuery(fileInput).attr('accept').length || (e.dataTransfer.files.length === 1 && acceptedFiles.includes(thisFileType)) ){ //If the uploader does not restrict file types, or if only one file was uploaded and that filetype is accepted
					jQuery(dropArea).addClass('dropped is-valid');

					fileInput.files = e.dataTransfer.files; //Fill the file upload input with the uploaded file
					jQuery(fileInput).parents('.custom-file').find('.custom-file-label').text(e.dataTransfer.files[0].name); //Update the Bootstrap label to show the filename

					thisEvent.action = 'Dropped (Accepted)';
					nebula.dom.document.trigger('nebula_event', thisEvent);
					ga('send', 'event', thisEvent.category, thisEvent.action, thisEvent.fileType);

				} else {
					nebula.temporaryClass(jQuery(dropArea), 'rejected', '', 1500);
					nebula.applyValidationClasses(jQuery(fileInput), 'invalid', true); //Show the invalid message

					thisEvent.action = 'Dropped (Rejected)';
					nebula.dom.document.trigger('nebula_event', thisEvent);
					ga('send', 'event', thisEvent.category, thisEvent.action, thisEvent.fileType);
				}
			});
		});
	}
};

//Convert img tags with class .svg to raw SVG elements
nebula.svgImgs = async function(){
	jQuery('img.svg').each(function(){
		let oThis = jQuery(this);

		if ( oThis.attr('src').includes('.svg') ){ //If the src has a .svg extension
			fetch(oThis.attr('src'), {
				method: 'GET',
			}).then(function(response){
				if ( response.ok ){
					return response.text();
				}
			}).then(function(data){
				let theSVG = jQuery(data); //Get the SVG tag, ignore the rest
				theSVG = theSVG.attr('id', oThis.attr('id')); //Add replaced image's ID to the new SVG
				theSVG = theSVG.attr('class', oThis.attr('class') + ' replaced-svg'); //Add replaced image's classes to the new SVG
				theSVG = theSVG.attr('role', 'img');
				theSVG = theSVG.attr('alt', nebula.sanitize(oThis.attr('alt'))); //An SVG with a role of img must include an alt attribute
				theSVG = theSVG.attr('aria-label', nebula.sanitize(oThis.attr('alt'))); //Add an aria-label attribute as well
				theSVG = theSVG.attr('data-original-src', oThis.attr('src')); //Add an attribute of the original SVG location
				theSVG = theSVG.removeAttr('xmlns:a'); //Remove invalid XML tags

				oThis.replaceWith(theSVG); //Replace image with new SVG

				//Use the alt attribute as a title tag within the SVG (title must be the first tag inside the <svg>) as well
				if ( oThis.attr('alt') ){
					theSVG.prepend('<title>' + nebula.sanitize(oThis.attr('alt')) + '</title>'); //Sanitized to prevent XSS
				}

				//Move the title attribute to the description element within the SVG
				if ( oThis.attr('title') ){
					theSVG.prepend('<description>' + nebula.sanitize(oThis.attr('title')) + '</description>'); //Sanitized to prevent XSS
				}
			});
		}
	});
};

//Listen for scrollTo events
nebula.scrollToListeners = function(){
	//An href starts with a hash ID but is not only a hash ("#content" but not "#"). Do not use *="#" to prevent conflicts with other libraries who are linking to separate pages with an anchor on the destination.
	nebula.dom.document.on('click keyup', 'a[href^="#"]:not([href="#"])', function(e){
		if ( e.type === 'click' || (e.type === 'keyup' && (e.key === ' ' || e.key === 'Enter')) ){ //Spacebar or Enter
			let avoid = '.no-scroll, .mm-menu, .carousel, .tab-content, .modal, [data-toggle], #wpadminbar, #query-monitor';
			if ( !jQuery(this).is(avoid) && !jQuery(this).parents(avoid).length ){
				if ( location.pathname.replace(/^\//, '') === this.pathname.replace(/^\//, '') && location.hostname === this.hostname ){ //Ensure the link does not have a protocol and is internal
					let thisHash = this.hash; //Defined here because scope of "this" changes later
					let scrollElement = jQuery.find(thisHash) || jQuery('[name=' + thisHash.slice(1) +']'); //Determine the target

					if ( scrollElement.length ){ //If target exists
						let pOffset = ( jQuery(this).attr('data-offset') )? parseFloat(jQuery(this).attr('data-offset')) : nebula.scroll.offset; //Determine the offset
						let speed = nebula.scroll.speed || 500;

						nebula.scrollTo(scrollElement, pOffset, speed, false, function(){
							history.replaceState({}, '', thisHash); //Add the hash to the URL so it can be refreshed, copied, links, etc. ReplaceState does this without affecting the back button.
						});

						return false;
					}
				}
			}
		}
	});

	//Using the nebula-scrollto class with data-scrollto attribute
	nebula.dom.document.on('click keyup', '.nebula-scrollto', function(e){
		if ( e.type === 'click' || (e.type === 'keyup' && (e.key === ' ' || e.key === 'Enter')) ){ //Spacebar or Enter
			let pOffset = ( jQuery(this).attr('data-offset') )? parseFloat(jQuery(this).attr('data-offset')) : nebula.scroll.offset;

			if ( jQuery(this).attr('data-scrollto') ){
				let scrollElement = jQuery.find(jQuery(this).attr('data-scrollto'));

				if ( scrollElement !== '' ){
					let scrollSpeed = nebula.scroll.speed || 500;
					nebula.scrollTo(scrollElement, pOffset, scrollSpeed);
				}
			}

			return false;
		}
	});
};

//Scroll an element into view
//This can eventually be replaced with scrollIntoView() native JS function, but until it has a timing feature it is not as robust. Also smooth scroll-behavior in CSS interferes with this.
//Note: Offset must be an integer
nebula.scrollTo = function(element, offset = 0, speed = 500, onlyWhenBelow = false, callback){
	if ( nebula.dom.html.css('scroll-behavior') !== 'smooth' ){ //If the html has smooth scroll-behavior, use that instead of this.
		if ( !offset ){
			offset = nebula.scroll.offset || 0; //Note: This selector should be the height of the fixed header, or a hard-coded offset.
		}

		//Account for the scroll-padding-top CSS property on the body element
		let scrollPaddingTop = parseInt(nebula.dom.body.css('scroll-padding-top'), 10); //Parse the CSS value as a base-10 integer
		if ( !isNaN(scrollPaddingTop) ){
			offset = offset + scrollPaddingTop;
		}

		//Call this function with a jQuery object to trigger scroll to an element (not just a selector string).
		if ( element ){
			if ( typeof element === 'string' ){
				element = jQuery.find(element); //Use find here to prevent arbitrary JS execution
			} else if ( !element.jquery ){ //Check if it is already a jQuery object
				element = jQuery(element);
			}

			if ( element.length ){
				let willScroll = true;
				if ( onlyWhenBelow ){
					let elementTop = element.offset().top-offset;
					let viewportTop = nebula.dom.document.scrollTop();
					if ( viewportTop-elementTop <= 0 ){
						willScroll = false;
					}
				}

				if ( willScroll ){
					if ( !speed ){
						speed = nebula.scroll.speed || 500;
					}

					jQuery('html, body').animate({
						scrollTop: element.offset().top-offset
					}, speed, function(){
						nebula.focusOnElement(element);

						if ( callback ){
							return callback();
						}
					});
				}
			}

			return false;
		}
	}
};

//Temporarily change an element class (like Font Awesome or Bootstrap icon) and then change back after a period of time
nebula.temporaryClass = function(element, activeClass, inactiveClass, period = 1500){
	if ( element && activeClass ){
		if ( typeof element === 'string' ){
			element = jQuery(element);
		}

		if ( !inactiveClass ){
			if ( element.is('fa, fas, far, fab, fad') ){ //Font Awesome icon element
				inactiveClass = (/fa-(?!fw)\S+/i).test(element.attr('class')); //Match the first Font Awesome icon class that is the actual icon (exclude fa-fw for example)
			} else if ( element.is('bi') ){ //Bootstrap icon element
				inactiveClass = (/bi-\S+/i).test(element.attr('class')); //Match the first Bootstrap icon class
			} else {
				inactiveClass = ''; //Set to an empty string to only use a temporary active class
			}
		}

		element.removeClass(inactiveClass).addClass(activeClass + ' temporary-status-active'); //Remove the inactive class and add the active class
		setTimeout(function(){
			element.removeClass(activeClass + ' temporary-status-active').addClass(inactiveClass); //After the period of time, revert back to the inactive class
		}, period);
	}

	return false;
};

//Vertical subnav expanders
nebula.subnavExpanders = function(){
	if ( nebula.site?.options?.sidebar_expanders && jQuery('#sidebar-section .menu').length ){
		jQuery('#sidebar-section .menu li.menu-item:has(ul)').addClass('has-expander').append('<a class="toplevelvert_expander closed" href="#"><i class="fas fa-caret-left"></i> <span class="sr-only">Expand</span></a>');
		jQuery('.toplevelvert_expander').parent().children('.sub-menu').hide();
		nebula.dom.document.on('click', '.toplevelvert_expander', function(){
			jQuery(this).toggleClass('closed open').parent().children('.sub-menu').slideToggle();
			return false;
		});

		//Automatically expand subnav to show current page
		jQuery('.current-menu-ancestor').children('.toplevelvert_expander').click();
		jQuery('.current-menu-item').children('.toplevelvert_expander').click();
	}
};

//Functionality for selecting and copying text using Nebula Pre tags.
nebula.pre = async function(){
	//Format non-shortcode pre tags to be styled properly
	jQuery('pre.nebula-code').each(function(){
		if ( !jQuery(this).parent('.nebula-code-con').length ){
			let lang = jQuery(this).attr('data-lang') || '';
			if ( lang === '' ){
				let langMatches = jQuery(this).attr('class').match(/lang(?:uage)?-(\S*)/i);
				lang = ( langMatches )? langMatches[0] : ''; //Use a class that starts with "lang-" or "language-" Ex: "lang-JavaScript"
			}
			if ( lang === '' ){
				lang = jQuery(this).attr('class').replace('nebula-code', '').replaceAll(/(\s*)((wp|m.|p.|nebula)-\S+)(\s*)/gi, '').trim(); //Remove expected classes and use remaining class as language
			}

			lang = escape(lang); //Escape for reuse into the DOM

			jQuery(this).addClass(lang.toLowerCase()).wrap('<div class="nebula-code-con clearfix ' + lang.toLowerCase() + '"></div>');
			jQuery(this).closest('.nebula-code-con').prepend('<span class="nebula-code codetitle ' + lang.toLowerCase() + '">' + lang + '</span>');
		}
	});

	//Manage copying snippets to clipboard
	if ( 'clipboard' in navigator ){
		jQuery('.nebula-code-con').each(function(){
			jQuery(this).append('<a href="#" class="nebula-selectcopy-code">Copy to Clipboard</a>');
			jQuery(this).find('p:empty').remove(); //Sometimes WordPress adds extra/empty <p> tags. These mess with spacing, so we remove them.
		});

		nebula.dom.document.on('click', '.nebula-selectcopy-code', function(){
			let oThis = jQuery(this);
			if ( oThis.hasClass('error') ){ //If we already errored, stop trying
				return false;
			}

			let text = jQuery(this).closest('.nebula-code-con').find('pre').text();

			navigator.clipboard.writeText(text).then(function(){
				oThis.text('Copied!').removeClass('error').addClass('success');
				setTimeout(function(){
					oThis.text('Copy to clipboard').removeClass('success');
				}, 1500);
			}).catch(function(error){ //This can happen if the user denies clipboard permissions
				ga('send', 'exception', {'exDescription': '(JS) Clipboard API error: ' + error, 'exFatal': false});
				oThis.text('Unable to copy.').addClass('error');
			});

			return false;
		});
	}
};

//Cookie notification
nebula.cookieNotification = async function(){
	if ( jQuery('#nebula-cookie-notification').length && !nebula.readCookie('acceptcookies') ){
		//Show the notice as soon as it will not interfere with loading nor become laggy
		window.requestAnimationFrame(function(){ //Change to requestIdleCallback when Safari supports it
			jQuery('#nebula-cookie-notification').addClass('active');
		});

		//Hide the interface upon acceptance
		nebula.dom.document.on('click', '#nebula-cookie-accept', function(){
			nebula.createCookie('acceptcookies', true);

			window.requestAnimationFrame(function(){
				jQuery('#nebula-cookie-notification').removeClass('active');

				//Remove the entire element after the animation completes
				setTimeout(function(){
					jQuery('#nebula-cookie-notification').remove();
				}, 1000); //The animation is set to 750ms
			});

			return false;
		});
	}
};

//Lazy load and initialize Mmenu separately because it has additional conditions
nebula.initMmenu = async function(){
	if ( jQuery('#offcanvasnav').length ){
		let isMobileBarVisible = ( jQuery('#mobilebarcon').css('border-left-color') === 'rgba(255, 255, 255, 0)' )? true : false; //This is used to determine if the element is actually visible (because even though its visibility is hidden, JS cannot detect that.
		if ( isMobileBarVisible ){
			nebula.once(function(){
				nebula.loadJS(nebula.site.resources.scripts.nebula_mmenu, 'mmenu').then(function(){
					nebula.mmenus();
				});

				nebula.loadCSS(nebula.site.resources.styles.nebula_mmenu);
			}, 'Mmenu init');
		}
	}
};

//Initialize Mmenu
nebula.mmenus = async function(){
	//Ensure the offcanvas nav element exists
	let offcanvasNav = jQuery('#offcanvasnav'); //This is essential, so check it here in case this function is called manually
	if ( offcanvasNav.length ){
		let offcanvasNavTriggerIcon = jQuery('a.offcanvasnavtrigger i');

		let navbars = []; //Think of these as "rows" in the Mmenu panel

		//Add the search navbar
		navbars.push({
			position: 'top',
			content: ['searchfield'] //Add a search field to this navbar
		});

		//Add the tab navbar for the utility menu (if it exists)
		if ( jQuery('#utility-panel').length && (!jQuery('#utility-nav').hasClass('no-mobile') && !jQuery('#utility-panel').parents('.no-mobile').length) ){ //If the utility menu exists and is not manually disabled from the offcanvas menu via a class
			navbars.push({
				position: 'top',
				type: 'tabs',
				content: [
					'<a href="#main-panel">Main Menu</a>',
					'<a href="#utility-panel">Other Links</a>'
				]
			});
		}

		//Add the title navbar
		navbars.push({
			position: 'top',
			content: ['prev', 'title'] //This defaults to "Menu". Can it be changed?
		});

		const offcanvasMmenu = new Mmenu('#offcanvasnav', {
			//Options
			wrappers: ['wordpress'], //This handles the "current-menu-item" selected class name automatically
			extensions: [
				'pagedim-black', //Dim the page when Mmenu is open ('-white' or '-black')
				'fx-menu-slide', //Subtly animate the menu items in too //See if this is laggy on mobile
				'multiline', //Long link text wraps to multiple links
				'shadow-panels', //Add a shadow to sub-nav panels
			],
			offCanvas: true, //Enable the offcanvas API (for opens and closes)
			pageScroll: { //Enable smooth scrolling. May resolve #1967– if so keep it, if not remove it.
				scroll: true,
				update: true
			},
			backButton: {
	    		close: true //Close the offcanvas menu when the browser's back button is used
	        },
			keyboardNavigation: { //This is not yet working...
				enhance: true //Allow for enhanced keyboard navigation such as the "escape" key closing the menu
			},
			lazySubmenus: {
				load: true //Lazy load the sub-nav panels
			},
			counters: true, //Add counters to show the number of sub-nav items
			iconPanels: true, //Show a small part of the parent panels (for sub-nav items)
			navbars: navbars,
			searchfield: {
				//panel: true, //This shows all search results in a single panel, but is causing an error in Mmenu 8.5.21
				showSubPanels: false
			},
			setSelected: {
				hover: true
			},
			hooks: {
				'open:start': function(){ //When Mmenu has started opening
					offcanvasNavTriggerIcon.removeClass('fa-bars').addClass('fa-times');

					if ( typeof jQuery.tooltip !== 'undefined' ){
						jQuery('[data-toggle="tooltip"]').tooltip('hide');
					}

					nebula.timer('(Nebula) Mmenu', 'start');
				},
				'close:start': function(){ //When Mmenu has started closing
					offcanvasNavTriggerIcon.removeClass('fa-times').addClass('fa-bars');
					ga('send', 'timing', 'Mmenu', 'Closed', Math.round(nebula.timer('(Nebula) Mmenu', 'lap')), 'From opening mmenu until closing mmenu');
				},
			}
		}, {
			searchfield: {
				clear: true,
				form: {
					method: 'get',
					action: nebula.site.home_url,
				},
				input: {
					name: 's',
				}
			}
		});

		nebula.dom.document.on('click', '#offcanvasnav .mm-menu li a:not(.mm-next)', function(){
			ga('send', 'timing', 'Mmenu', 'Navigated', Math.round(nebula.timer('(Nebula) Mmenu', 'lap')), 'From opening mmenu until navigation');
		});
	}
};

//Show help messages in the console to assist developers by informing of common issues and guide them to relevant documentation
nebula.help = function(message, path, usage=false){
	let documentationHostname = '';

	if ( !path.includes('http') ){ //If the path is a full URL, use it explicitly
		documentationHostname = 'https://nebula.gearside.com'; //Otherwise start with this hostname

		if ( path.charAt(0) !== '/' ){ //If the path does not begin with a slash, add one
			path = '/' + path;
		}

		let queryChar = ( path.includes('?') )? '&' : '?'; //If the path already has a query string, use an ampersand for ours

		path = path + queryChar + 'utm_source=console';
	}

	let url = documentationHostname + path;

	console.error('📎 [Nebula Help]', message, 'Docs: ' + url); //Show the message to the developer in the console
	ga('send', 'exception', {'exDescription': '(JS) ' + message, 'exFatal': false}); //Report the error to Google Analytics to log it

	if ( usage ){
		nebula.usage(message);
	}
};