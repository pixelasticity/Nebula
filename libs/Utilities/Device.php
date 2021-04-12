<?php

if ( !defined('ABSPATH') ){ die(); } //Exit if accessed directly

if ( !trait_exists('Device') ){
	trait Device {
		public function hooks(){
			//Add hooks here
		}

		//Boolean return if the user's device is mobile.
		public function is_mobile(){
			$override = apply_filters('pre_nebula_is_mobile', null);
			if ( isset($override) ){return $override;}

			global $is_iphone;
			if ( wp_is_mobile() || $is_iphone ){
				return true;
			}

			return false;
		}

		//Boolean return if the user's device is a desktop.
		public function is_desktop(){
			$override = apply_filters('pre_nebula_is_desktop', null);
			if ( isset($override) ){return $override;}

			if ( !wp_is_mobile() ){ //This does a basic check for mobile or tablet devices.
				return true;
			}

			return false;
		}

		//Returns the requested information of the operating system of the user's device.
		public function get_os($info='name'){
			$override = apply_filters('pre_nebula_get_os', null, $info);
			if ( isset($override) ){return $override;}

			global $is_iphone;
			switch ( strtolower($info) ){
				case 'full':
				case 'name':
					if ( $is_iphone ){
						return 'ios';
					}
					break;
				default:
					return false;
			}
		}

		//Returns the requested information of the model of the user's device.
		public function get_device($info='model'){
			$override = apply_filters('pre_nebula_get_device', null, $info);
			if ( isset($override) ){return $override;}

			global $is_iphone;
			$info = str_replace(' ', '', $info);
			switch ( strtolower($info) ){
				case 'brand':
				case 'brandname':
				case 'make':
				case 'model':
				case 'name':
				case 'type':
					if ( $is_iphone ){
						return 'iphone';
					}
					break;
				case 'formfactor':
					if ( wp_is_mobile() || $is_iphone ){
						return 'mobile';
					}
					return 'desktop';
				default:
					return '';
			}
		}

		//Returns the requested information of the browser being used.
		public function get_client($info){ return get_browser($info); }
		public function get_browser($info='name'){
			$override = apply_filters('pre_nebula_get_browser', null, $info);
			if ( isset($override) ){return $override;}

			//Hook in here to add custom checks to get_browser() calls
			$additional_checks = apply_filters('nebula_get_browser', false, $info);
			if ( !empty($additional_checks) ){
				return $additional_checks;
			}

			global $is_gecko, $is_opera, $is_safari, $is_chrome;
			switch ( strtolower($info) ){
				case 'full':
				case 'name':
				case 'browser':
				case 'client':
					if ( $is_opera ){return 'opera';}
					elseif ( $is_safari ){return 'safari';}
					elseif ( $is_chrome ){return 'chrome';}
					return false;
				case 'engine':
					if ( $is_gecko ){return 'gecko';}
					elseif ( $is_safari ){return 'webkit';}
					return false;
				default:
					return false;
			}
		}

		//Check the browser
		public function is_browser($browser=null){
			$override = apply_filters('pre_nebula_is_browser', null, $browser);
			if ( isset($override) ){return $override;}

			//This only checks browser name
			if ( $this->get_browser() == strtolower($browser) ){
				return true;
			}

			return false;
		}

		//Check for bot/crawler traffic
		//UA lookup: http://www.useragentstring.com/pages/Crawlerlist/
		public function is_bot(){
			$override = apply_filters('pre_nebula_is_bot', null);
			if ( isset($override) ){return $override;}

			if ( $this->is_googlebot() ){
				return true;
			}

			if ( !empty($_SERVER['HTTP_USER_AGENT']) ){
				$bot_regex = array('bot', 'crawl', 'spider', 'feed', 'slurp', 'tracker', 'http', 'favicon', 'curl', 'coda', 'netcraft');
				$all_bot_regex = apply_filters('nebula_bot_regex', $bot_regex);
				foreach( $all_bot_regex as $bot_regex ){
					if ( strpos(strtolower($_SERVER['HTTP_USER_AGENT']), $bot_regex) !== false ){
						return true;
					}
				}
			}

			return false;
		}

		//Check if the current visitor is Googlebot (search indexing)
		function is_googlebot(){
			if ( !empty($_SERVER['HTTP_USER_AGENT']) && strpos($_SERVER['HTTP_USER_AGENT'], 'Googlebot') ){
				$hostname = gethostbyaddr($this->get_ip_address(false));
				if ( preg_match('/\.googlebot|google\.com$/i', $hostname) ){
					return true;
				}
			}

			return false;
		}
	}
}