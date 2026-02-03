/**
 * ProveIt is a reference manager for Wikipedia and any other MediaWiki wiki
 * Documentation at https://www.mediawiki.org/wiki/ProveIt
 *
 * Copyright 2008-2011 Georgia Tech Research Corporation, Atlanta, GA 30332-0415, ALL RIGHTS RESERVED
 * Copyright 2011-2014 Matthew Flaschen
 * Rewritten, internationalized, improved and maintained by Sophivorus since 2014
 *
 * ProveIt is available under the GNU Free Documentation License (http://www.gnu.org/copyleft/fdl.html),
 * the Creative Commons Attribution/Share-Alike License 3.0 (http://creativecommons.org/licenses/by-sa/3.0/)
 * and the GNU General Public License 2 (http://www.gnu.org/licenses/gpl-2.0.html)
 */

/* global ProveIt, WikitextParser, ve */

// <nowiki>

window.ProveIt = {

	/**
	 * Hard-coded interface messages in English
	 * Translations are fetched from Gerrit when available
 	 */
	messages: {
		'proveit-add-reference-button': 'Add reference',
		'proveit-add-reference-tooltip': 'Add a <ref> tag with a citation template inside',
		'proveit-add-template-button': 'Add template',
		'proveit-add-template-tooltip': 'Add a citation template without a <ref> tag',
		'proveit-refresh-button': 'Refresh list',
		'proveit-refresh-tooltip': 'Refresh the list of references',
		'proveit-back-button': 'Back',
		'proveit-back-tooltip': 'Return to the reference list',
		'proveit-back-confirm': 'Your changes have not been copied to the page yet. Are you sure you want to leave?',
		'proveit-previous-button': 'Previous',
		'proveit-previous-tooltip': 'Go to the previous reference',
		'proveit-next-button': 'Next',
		'proveit-next-tooltip': 'Go to the next reference',
		'proveit-reuse-button': 'Reuse',
		'proveit-reuse-tooltip': 'Reuse this reference in another part of the page',
		'proveit-filter-fields': 'Filter fields',
		'proveit-filter-list': 'Filter list',
		'proveit-insert-button': 'Insert',
		'proveit-insert-tooltip': 'Insert in the page',
		'proveit-no-references': 'No references found',
		'proveit-normalize-button': 'Normalize all',
		'proveit-normalize-tooltip': 'Normalize the spacing and parameter order of all the references and citation templates',
		'proveit-normalize-confirm': 'You are about to normalize the spacing and parameter order of all the references and citation templates. Please note that edits that only do cosmetic changes may be considered disruptive.',
		'proveit-reference-name-label': 'Reference name',
		'proveit-reference-name-warning': 'This reference has one or more reuses or subreferences. Deleting the name will unlink them.',
		'proveit-reference-name-required': 'Enter a name to reuse this reference.',
		'proveit-reference-group-label': 'Reference group',
		'proveit-reference-extends-label': 'Main reference',
		'proveit-reference-extends-tooltip': 'Name of the reference of which this is an extension',
		'proveit-reference-content-label': 'Reference content',
		'proveit-generate-label': 'Automatic citation',
		'proveit-generate-button': 'Generate',
		'proveit-generate-tooltip': 'Enter a URL, DOI, ISBN, PMC/PMID or a well-formed plain-text citation and then click here to try to generate a citation template automatically',
		'proveit-generate-placeholder': 'Enter a URL, DOI, ISBN, PMC/PMID or a well-formed plain-text citation',
		'proveit-generate-generating': 'Generating...',
		'proveit-generate-fail': 'A citation could not be generated from the given input',
		'proveit-template-label': 'Template',
		'proveit-template-select': 'Select a template',
		'proveit-remove-button': 'Remove',
		'proveit-remove-tooltip': 'Remove from the page',
		'proveit-remove-confirm': 'This will also remove all reuses and subreferences of this reference. Ok?',
		'proveit-show-all-button': 'Show all',
		'proveit-show-all-tooltip': 'Show all the fields',
		'proveit-archive-button': 'Archive',
		'proveit-archive-tooltip': 'Get the latest archived URL from the Wayback Machine',
		'proveit-archive-fetching': 'Fetching...',
		'proveit-archive-success': 'Done! Remember to test the archived URL before saving.',
		'proveit-archive-not-found': 'No archived URL was found',
		'proveit-archive-error': 'Error accessing Wayback Machine',
		'proveit-today-button': 'Today',
		'proveit-today-tooltip': 'Insert today\'s date',
		'proveit-normalize-date-button': 'Normalize',
		'proveit-normalize-date-tooltip': 'Normalize the date according to this wiki\'s standards',
		'proveit-update-button': 'Update',
		'proveit-update-tooltip': 'Update in the page'
	},

	/**
	 * Template data of the templates
	 *
	 * @type {Object} Map from canonical template name to template data
	 */
	templateData: {},

	/**
	 * Aliases of the templates
	 *
	 * @type {Object} Map from template alias to canonical template name
	 */
	templateAliases: {},

	citationPatterns: [
		/(?<last>.+?), (?<first>.+?) \((?<date>\d{4})\) '*(?<title>.+?)'*\.? pp?\.? ?(?<pages>[0-9-]+)/,
		/(?<last>.+?), (?<first>.+?) \((?<date>\d{4})\) '*(?<title>.+?)'*\.?/
	],

	/**
	 * User-Agent for API calls
	 */
	userAgent: 'ProveIt/3.0 (https://www.mediawiki.org/wiki/ProveIt)',
	
	/**
	 * Initialization script
	 */
	async init() {

		// Remove any previous instance
		$( '#proveit' ).remove();

		// Only continue on wikitext pages
		const contentModel = mw.config.get( 'wgPageContentModel' );
		if ( contentModel !== 'wikitext' ) {
			return;
		}

		// Only continue on supported namespaces
		const namespace = mw.config.get( 'wgNamespaceNumber' );
		const namespaces = mw.config.get( 'proveit-namespaces' );
		if ( namespaces && !namespaces.includes( namespace ) ) {
			return;
		}

		// Only continue on supported editors
		const editor = ProveIt.getEditor();
		if ( !editor ) {
			return;
		}

		// Load Codex and create the app
		const require = await mw.loader.using( '@wikimedia/codex' );
		const Vue = require( 'vue' );
		const Codex = require( '@wikimedia/codex' );
		const app = Vue.createMwApp( ProveIt.rootComponent );
		app.component( 'cdx-button', Codex.CdxButton );
		app.component( 'cdx-field', Codex.CdxField );
		app.component( 'cdx-text-input', Codex.CdxTextInput );
		app.component( 'cdx-text-area', Codex.CdxTextArea );
		app.component( 'cdx-select', Codex.CdxSelect );
		app.component( 'cdx-lookup', Codex.CdxLookup );
		app.directive( 'tooltip', Codex.CdxTooltip );

		// Create a dummy element to mount the app
		const mountPoint = document.createElement( 'div' );
		document.body.append( mountPoint );
		app.mount( mountPoint );
	},

	rootComponent: {

		template: `
			<div id="proveit">
				<div id="proveit-header">
					<span id="proveit-logo" @click="toggle">
						<span class="proveit-logo-bracket">[</span>
						<span id="proveit-logo-text">{{ logo }}</span>
						<span class="proveit-logo-bracket">]</span>
					</span>
					<div id="proveit-header-buttons" v-if="!minimized">
						<div v-if="form">
							<cdx-button @click="back" :title="messages[ 'proveit-back-tooltip' ]">{{ messages[ 'proveit-back-button' ] }}</cdx-button>
							<cdx-button v-if="form.index > 0" @click="previousItem" :title="messages[ 'proveit-previous-tooltip' ]">{{ messages[ 'proveit-previous-button' ] }}</cdx-button>
							<cdx-button v-if="form.index < list.length - 1" @click="nextItem" :title="messages[ 'proveit-next-tooltip' ]">{{ messages[ 'proveit-next-button' ] }}</cdx-button>
						</div><div v-else>
							<cdx-button action="progressive" @click="addReference" v-tooltip="messages[ 'proveit-add-reference-tooltip' ]">{{ messages[ 'proveit-add-reference-button' ] }}</cdx-button>
							<cdx-button action="progressive" @click="addTemplate" v-tooltip="messages[ 'proveit-add-template-tooltip' ]">{{ messages[ 'proveit-add-template-button' ] }}</cdx-button>
						</div>
					</div>
				</div>
				<div id="proveit-body" v-if="!minimized">
					<form id="proveit-form" v-if="form">
						<cdx-field id="reference-name-field" v-if="form.object.type === 'reference' && !form.object.extends" :status="form.referenceNameStatus" :messages="form.referenceNameMessages">
							<cdx-text-input v-model="form.object.name" @change="onReferenceNameChange" />
							<template #label>{{ messages[ 'proveit-reference-name-label' ] }}</template>
						</cdx-field>
						<cdx-field v-if="form.object.type === 'reference'">
							<cdx-text-input v-model="form.object.group" />
							<template #label>{{ messages[ 'proveit-reference-group-label' ] }}</template>
						</cdx-field>
						<cdx-field v-if="form.object.type ==='reference' && form.object.extends">
							<cdx-text-input v-model="form.object.extends" />
							<template #label>{{ messages[ 'proveit-reference-extends-label' ] }}</template>
						</cdx-field>
						<cdx-field v-if="form.object.type ==='reference'" id="proveit-reference-content-field">
							<cdx-text-area v-model="form.object.content" @change="onReferenceContentChange" />
							<template #label>{{ messages[ 'proveit-reference-content-label' ] }}</template>
						</cdx-field>
						<cdx-field id="proveit-generate-field" :status="form.generateStatus" :messages="form.generateMessages">
							<cdx-button type="button" @click="generate" v-tooltip="messages[ 'proveit-generate-tooltip' ]">{{ messages[ 'proveit-generate-button' ] }}</cdx-button>
							<cdx-text-input v-model="form.generateInput" :placeholder="messages[ 'proveit-generate-placeholder' ]" />
							<template #label>{{ messages[ 'proveit-generate-label' ] }}</template>
						</cdx-field>
						<cdx-field id="proveit-template-field">
							<cdx-select v-model:selected="form.templateSelected" @update:selected="onTemplateSelect" :menu-items="form.templateOptions" :default-label="messages[ 'proveit-template-select' ]" />
							<template #label>{{ messages[ 'proveit-template-label' ] }}</template>
						</cdx-field>
						<div id="proveit-template-fields" v-if="form.templateFields">
							<cdx-field v-for="field in form.templateFields" :key="field.name" v-show="field.visible" :status="field.status" :messages="field.messages" :class="field.class">
								<cdx-button v-if="field.type === 'url' && field.value && !field.value.includes( 'archive.org' )" type="button" @click="event => archiveURL( event, field )" :title="messages[ 'proveit-archive-tooltip' ]">{{ messages[ 'proveit-archive-button' ] }}</cdx-button>
								<cdx-button v-if="field.type === 'date' && !field.value" type="button" @click="onTodayButtonClick( field )" :title="messages[ 'proveit-today-tooltip' ]">{{ messages[ 'proveit-today-button' ] }}</cdx-button>
								<cdx-button v-if="field.type === 'date' && /^[0-9]{14}$/.test( field.value )" type="button" @click="onNormalizeDateButtonClick( field )" :title="messages[ 'proveit-normalize-date-tooltip' ]">{{ messages[ 'proveit-normalize-date-button' ] }}</cdx-button>
								<cdx-lookup v-if="field.type === 'wiki-page-name'" v-model:input-value="field.value" v-model:selected="field.value" :menu-items="field.suggestions" @input="value => onWikiPageNameInput( value, field )"  @change="onTemplateFieldChange( field )" />
								<cdx-text-area v-else-if="field.type === 'content'" v-model="field.value" @change="onTemplateFieldChange( field )" />
								<cdx-text-input v-else v-model="field.value" @change="onTemplateFieldChange( field )" />
								<template #label><span :data-tooltip="field.tooltip">{{ field.label }}</span></template>
							</cdx-field>
						</div>
					</form>
					<ol v-else-if="list.length" id="proveit-list">
						<li class="proveit-item" v-for="( object, index ) in list" @click="viewForm( object, index )">
							<span class="proveit-number">{{ index + 1 }}</span>
							<span class="proveit-arrow" @click.stop="highlight( object )">↑</span>
							<sup class="proveit-letter" v-if="object.reuses && object.reuses.length" @click.stop="highlight( object )">a</sup>
							<sup class="proveit-letter" v-for="reuse in object.reuses" @click.stop="highlight( reuse )">{{ reuse.letter }}</sup>
							<span class="proveit-template" v-if="object.template || object.name">{{ object.template && object.template.name || object.name }}</span>
							<span class="proveit-snippet">{{ object.snippet }}</span>
							<ol class="proveit-subrefs" v-if="object.subrefs && object.subrefs.length">
								<li class="proveit-subref" v-for="subref in object.subrefs" @click.stop="highlight( subref )">{{ subref.snippet }}</li>
							</ol>
						</li>
					</ol>
					<div v-else id="proveit-no-references-message">{{ messages[ 'proveit-no-references' ] }}</div>
				</div>
				<div id="proveit-footer" v-if="!minimized">
					<div v-if="form">
						<cdx-button id="proveit-reuse-button" v-if="form.object.index !== undefined && form.object.type === 'reference'" @click="reuse" :title="messages[ 'proveit-reuse-tooltip' ]">{{ messages[ 'proveit-reuse-button' ] }}</cdx-button>
						<cdx-button id="proveit-remove-button" v-if="form.object.index !== undefined" @click="remove" :title="messages[ 'proveit-remove-tooltip' ]">{{ messages[ 'proveit-remove-button' ] }}</cdx-button>
						<cdx-button id="proveit-update-button" v-if="form.object.index !== undefined" @click="update" :title="messages[ 'proveit-update-tooltip' ]">{{ messages[ 'proveit-update-button' ] }}</cdx-button>
						<cdx-button id="proveit-insert-button" v-if="form.object.index === undefined" @click="insert" :title="messages[ 'proveit-insert-tooltip' ]">{{ messages[ 'proveit-insert-button' ] }}</cdx-button>
						<cdx-text-input id="proveit-filter-fields" v-if="form.templateFields" :placeholder="messages[ 'proveit-filter-fields' ]" @keyup="filterFields"></cdx-text-input>
						<cdx-button id="proveit-show-all-button" v-if="form.templateFields" @click="showAll" :title="messages[ 'proveit-show-all-tooltip' ]">{{ messages[ 'proveit-show-all-button' ] }}</cdx-button>
					</div>
					<div v-else-if="list.length">
						<cdx-button @click="viewList" :title="messages[ 'proveit-refresh-tooltip' ]">{{ messages[ 'proveit-refresh-button' ] }}</cdx-button>
						<cdx-button @click="normalize" :title="messages[ 'proveit-normalize-tooltip' ]">{{ messages[ 'proveit-normalize-button' ] }}</cdx-button>
						<cdx-text-input id="proveit-filter-list" :placeholder="messages[ 'proveit-filter-list' ]" @keyup="filterList"></cdx-text-input>
					</div>
				</div>
			</div>
		`,

		data() {
			return {
				logo: 'P',
				minimized: true,
				list: [],
				form: null
			};
		},

		mounted() {
			this.loaded = false;
			this.messages = {};

			// Make the UI draggable using the deprecated jQuery UI
			// Eventually this feature may have to be removed because it's not easy to replace
			$( '#proveit' ).draggable( {
				handle: $( '#proveit-header' ),
				containment: 'window',
				start: () => $( '#proveit' ).css( { right: 'auto', bottom: 'auto' } )
			} );
		},

		methods: {

			async toggle() {
				if ( !this.loaded ) {
					await this.load();
					this.viewList();
				}
				this.minimized = !this.minimized;
				this.logo = this.minimized ? 'P' : 'ProveIt';

				// Reset the position of the gadget when minimized
				// but store it in a cookie for future sessions (T148409)
				const $proveit = $( '#proveit' );
				if ( this.minimized ) {
					const right = $proveit.css( 'right' );
					const bottom = $proveit.css( 'bottom' );
					ProveIt.setCookie( 'position-right', right );
					ProveIt.setCookie( 'position-bottom', bottom );
					$proveit.css( { top: 'auto', left: 'auto', right: 0, bottom: 0 } );
				} else {
					const right = ProveIt.getCookie( 'position-right' ) || 0;
					const bottom = ProveIt.getCookie( 'position-bottom' ) || 0;
					$proveit.css( { top: 'auto', left: 'auto', right: right, bottom: bottom } );
				}
			},

			async load() {

				// Append the local template namespace to the template names
				const templateNames = mw.config.get( 'proveit-templates' ) || [];
				const formattedNamespaces = mw.config.get( 'wgFormattedNamespaces' );
				const templateNamespace = formattedNamespaces[ 10 ];
				const templateTitles = templateNames.map( ( templateName ) => templateNamespace + ':' + templateName );

				// Get the template data
				this.logo = '.'; // Indicate progress
				const response = await new mw.Api( { userAgent: ProveIt.userAgent } ).get( {
					action: 'templatedata',
					titles: templateTitles.join( '|' ),
					redirects: true,
					includeMissingTitles: true,
					format: 'json',
					formatversion: 2
				} );

				// Save the template data
				for ( const templateData of Object.values( response.pages ) ) {
					if ( 'missing' in templateData ) {
						continue;
					}
					const templateTitle = templateData.title;
					const templateName = templateTitle.substring( templateTitle.indexOf( ':' ) + 1 ); // Remove the namespace
					ProveIt.templateData[ templateName ] = templateData;
				}

				// Get all the aliases of the templates
				this.logo = '..'; // Indicate progress
				const response2 = await new mw.Api( { userAgent: ProveIt.userAgent } ).get( {
					action: 'query',
					titles: templateTitles.join( '|' ),
					prop: 'redirects',
					rdlimit: 'max',
					rdnamespace: 10,
					format: 'json',
					formatversion: 2
				} );

				// Map the redirects to the canonical names
				for ( const template of Object.values( response2.query.pages ) ) {
					if ( 'redirects' in template ) {
						const templateTitle = template.title;
						const templateName = templateTitle.substring( templateTitle.indexOf( ':' ) + 1 ); // Remove the namespace
						for ( const redirect of template.redirects ) {
							const redirectTitle = redirect.title;
							const redirectName = redirectTitle.substring( redirectTitle.indexOf( ':' ) + 1 ); // Remove the namespace
							ProveIt.templateAliases[ redirectName ] = templateName;
						}
					}
				}

				// Load WikitextParser.js
				// See https://www.mediawiki.org/wiki/WikitextParser.js
				this.logo = '...'; // Indicate progress
				await mw.loader.getScript( '//www.mediawiki.org/w/index.php?title=MediaWiki:Gadget-Global-WikitextParser.js&action=raw&ctype=text/javascript' );

				// Get the translations if the user prefers a language other than English
				const userLanguage = mw.config.get( 'wgUserLanguage' );
				if ( userLanguage !== 'en' ) {
					try {
						this.logo = '....'; // Indicate progress
						const response3 = await $.get( '//gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/gadgets/ProveIt/+/master/i18n/' + userLanguage + '.json?format=text' );
						const json = decodeURIComponent( window.atob( response3 ).split( '' ).map( ( character ) => '%' + ( '00' + character.charCodeAt( 0 ).toString( 16 ) ).slice( -2 ) ).join( '' ) ); // Decode base64 string
						const translations = JSON.parse( json );
						delete translations[ '@metadata' ];
						for ( const key in translations ) {
							ProveIt.messages[ key ] = translations[ key ];
						}
					} catch ( error ) {
						// If something goes wrong we naturally fallback to English, see https://phabricator.wikimedia.org/T394916
					}
				}
				this.messages = ProveIt.messages;
				mw.messages.set( ProveIt.messages );

				// Finish
				this.loaded = true;
			},

			async back() {
				// Prompt the user to confirm when leaving without saving (T148211)
				const object = this.form.object;
				if ( object.wikitext !== object.toWikitext() ) {
					const confirm = await OO.ui.confirm( mw.msg( 'proveit-back-confirm' ) );
					if ( !confirm ) {
						return;
					}
				}
				this.viewList();
			},

			async normalize() {

				// Inform users about normalization, but only once
				const cookie = ProveIt.getCookie( 'normalize-confirm' );
				if ( !cookie ) {
					const confirm = await OO.ui.confirm( mw.msg( 'proveit-normalize-confirm' ) );
					if ( confirm ) {
						ProveIt.setCookie( 'normalize-confirm', 1 );
					} else {
						return;
					}
				}

				// Normalize the wikitext of all objects
				let pageWikitext = ProveIt.getWikitext();
				for ( const object of this.list ) {
					const oldWikitext = object.wikitext;
					const newWikitext = object.toWikitext();
					pageWikitext = pageWikitext.replace( oldWikitext, newWikitext );
					object.wikitext = newWikitext;
				}
				$( '#wpTextbox1' ).textSelection( 'setContents', pageWikitext );

				this.addSummary();
				mw.track( 'stats.mediawiki_gadget_proveit_total', 1, { action: 'normalize' } );
			},

			insert() {
				const object = this.form.object;
				const wikitext = object.toWikitext();
				const index = $( '#wpTextbox1' ).textSelection( 'getCaretPosition' );
				$( '#wpTextbox1' ).textSelection( 'replaceSelection', wikitext );
				object.wikitext = wikitext;
				object.index = index;
				this.highlight( object );
				this.addSummary();
				this.toggle(); // T404063
				mw.track( 'stats.mediawiki_gadget_proveit_total', 1, { action: 'insert' } );
			},

			update() {
				let pageWikitext = ProveIt.getWikitext();

				// Update any reuses and subrefs
				const object = this.form.object;
				if ( object.type === 'reference' && object.content ) {
					const reference = object;
					const oldReference = new ProveIt.Reference( reference.wikitext );
					if ( reference.name !== oldReference.name ) {
						for ( const reuse of reference.reuses ) {
							reuse.name = reference.name;
							pageWikitext = pageWikitext.replace( reuse.wikitext, reuse.toWikitext() );
						}
						for ( const subref of reference.subrefs ) {
							subref.extends = reference.name;
							pageWikitext = pageWikitext.replace( subref.wikitext, subref.toWikitext() );
						}
					}
				}

				// Update the wikitext
				const oldWikitext = object.wikitext;
				const newWikitext = object.toWikitext();
				pageWikitext = pageWikitext.replace( oldWikitext, newWikitext );
				const start = pageWikitext.indexOf( newWikitext );
				const end = start + newWikitext.length;
				$( '#wpTextbox1' )
					.textSelection( 'setContents', pageWikitext )
					.textSelection( 'setSelection', { start: start, end: end } )
					.textSelection( 'scrollToCaretPosition' );
				object.wikitext = newWikitext;

				this.addSummary();
				mw.track( 'stats.mediawiki_gadget_proveit_total', 1, { action: 'update' } );
			},

			async remove() {
				const object = this.form.object;
				let pageWikitext = ProveIt.getWikitext();

				// Remove any reuses and subrefs
				if ( object.type === 'reference' && object.name && object.content ) {
					const reuses = object.getReuses();
					const subrefs = object.getSubrefs();
					if ( ( reuses.length || subrefs.length ) && await OO.ui.confirm( mw.msg( 'proveit-remove-confirm' ) ) ) {
						for ( const reuse of reuses ) {
							pageWikitext = pageWikitext.replace( reuse.wikitext, '' );
						}
						for ( const subref of subrefs ) {
							pageWikitext = pageWikitext.replace( subref.wikitext, '' );
						}
					}
				}

				// Remove the wikitext
				pageWikitext = pageWikitext.replace( object.wikitext, '' );
				$( '#wpTextbox1' )
					.textSelection( 'setContents', pageWikitext )
					.textSelection( 'setSelection', { start: object.index } )
					.textSelection( 'scrollToCaretPosition' );

				this.addSummary();
				this.viewList();
				mw.track( 'stats.mediawiki_gadget_proveit_total', 1, { action: 'remove' } );
			},

			reuse() {
				const reference = this.form.object;
				if ( !reference.name ) {
					this.form.referenceNameStatus = 'warning';
					this.form.referenceNameMessages = { warning: mw.msg( 'proveit-reference-name-required' ) };
					document.getElementById( 'reference-name-field' ).querySelector( 'input' ).focus();
					return;
				}

				// Insert the new reuse
				const reuse = new ProveIt.Reference( '<ref />' );
				reuse.name = reference.name;
				reuse.group = reference.group;
				reuse.index = $( '#wpTextbox1' ).textSelection( 'getCaretPosition' );
				reuse.wikitext = reuse.toWikitext();
				$( '#wpTextbox1' ).textSelection( 'replaceSelection', reuse.wikitext );

				reference.reuses.push( reuse );

				this.highlight( reuse );
				this.addSummary();
				mw.track( 'stats.mediawiki_gadget_proveit_total', 1, { action: 'reuse' } );
			},

			async generate( event ) {
				this.form.generateStatus = 'default'; // Reset the status

				// Make sure there's some input
				const input = this.form.generateInput;
				if ( !input ) {
					return;
				}

				// Define this recursive helper function
				function setParamValue( template, paramName, paramValue ) {
					if ( typeof paramName === 'string' && typeof paramValue === 'string' ) {
						template.params[ paramName ] = paramValue.replaceAll( '|', '{{!}}' ); // Escape pipes
					} else if ( paramName instanceof Array && paramValue instanceof Array ) {
						for ( const index in paramName ) {
							setParamValue( template, paramName[ index ], paramValue[ index ] );
						}
					}
				}

				// URLs, DOIs, ISBNs and PMC/PMIDs don't contain spaces
				// so if a space is found, it may be plain-text citation
				let template;
				if ( input.includes( ' ' ) ) {

					let templateName;
					if ( 'Citation' in ProveIt.templateData ) {
						templateName = 'Citation';
					} else if ( 'Citation' in ProveIt.templateAliases ) {
						templateName = ProveIt.templateAliases.Citation;
					} else {
						templateName = Object.keys( ProveIt.templateData )[ 0 ]; // Use the first template and hope for the best
					}
					template = new ProveIt.Template( '{{' + templateName + '}}' );

					// Build the wikitext
					let match;
					for ( const citationPattern of ProveIt.citationPatterns ) {
						match = input.match( citationPattern );
						if ( match ) {
							// Use the Citoid map to get the local parameter names and then set those parameters
							const templateData = ProveIt.templateData[ templateName ];
							const citoidMap = templateData.maps.citoid;
							const last = citoidMap.author[ 0 ][ 1 ];
							const first = citoidMap.author[ 0 ][ 0 ];
							const date = citoidMap.date;
							const title = citoidMap.title;
							const pages = citoidMap.pages;
							template.params[ last ] = match.groups.last;
							template.params[ first ] = match.groups.first;
							template.params[ date ] = match.groups.date;
							template.params[ title ] = match.groups.title;
							template.params[ pages ] = match.groups.pages;
							break;
						}
					}

					if ( !match ) {
						this.form.generateStatus = 'warning';
						this.form.generateMessages = { warning: mw.msg( 'proveit-generate-fail' ) };
						return;
					}

				} else {

					// Disable the button to prevent multiple clicks and hint the user that something is happening
					const button = event.target;
					button.textContent = mw.msg( 'proveit-generate-generating' );
					button.disabled = true;

					// Get the data
					try {
						const server = mw.config.get( 'wgServer' );
						const response = await $.get( server + '/api/rest_v1/data/citation/mediawiki/' + encodeURIComponent( input ) );
						const citoidData = response[0];

						// Get the template map
						const rest = new mw.Rest();
						const templateMapResponse = await rest.get( '/v1/page/MediaWiki:Citoid-template-type-map.json' );
						const templateMap = templateMapResponse.source && JSON.parse( templateMapResponse.source );

						// Set the template name
						const templateName = templateMap[ citoidData.itemType ];
						if ( !templateName ) {
							throw new Error();
						}
						template = new ProveIt.Template( '{{' + templateName + '}}' );

						// T404064
						if ( citoidData.date ) {
							citoidData.date = this.normalizeDate( citoidData.date );
						}

						// Set the template params
						const templateData = template.getTemplateData();
						const citoidMap = templateData.maps.citoid;
						for ( const citoidKey in citoidData ) {
							const paramName = citoidMap[ citoidKey ];
							const paramValue = citoidData[ citoidKey ];
							setParamValue( template, paramName, paramValue );
						}

						// Reset the button
						button.textContent = mw.msg( 'proveit-generate-button' );
						button.disabled = false;

					} catch ( error ) {
						this.form.generateStatus = 'warning';
						this.form.generateMessages = { warning: error.responseJSON.error };
						button.textContent = mw.msg( 'proveit-generate-button' );
						button.disabled = false;
						return;
					}
				}

				// Update the form
				const object = this.form.object;
				if ( object.type === 'reference' ) {
					const oldTemplate = object.getTemplate();
					const oldTemplateWikitext = oldTemplate ? oldTemplate.wikitext : '';
					const newTemplateWikitext = template.toWikitext();
					object.content = object.content.replace( oldTemplateWikitext, newTemplateWikitext );
					object.template = template;
				} else {
					object.name = template.name;
					object.params = template.params;
				}
				this.form.templateSelected = template.name;
				this.form.templateFields = template.getFields();
				mw.track( 'stats.mediawiki_gadget_proveit_total', 1, { action: 'generate' } );
			},

			highlight( object ) {
				let start = object.index;
				let end = start + object.wikitext.length;

				// Check if the object moved, and if it did, try to guess where
				// (this guess will fail when multiple objects have identical wikitext)
				const pageWikitext = ProveIt.getWikitext();
				if ( pageWikitext.substring( start, end ) !== object.wikitext ) {
					start = pageWikitext.indexOf( object.wikitext );
					end = start + object.wikitext.length;
				}

				$( '#wpTextbox1' )
					.trigger( 'focus' ) // Required by WikiEditor
					.textSelection( 'setSelection', { start: start, end: end } )
					.textSelection( 'scrollToCaretPosition' );
			},

			addReference() {
				const templateSelected = ProveIt.getCookie( 'template-selected' ); // Remember the last choice
				const referenceWikitext = templateSelected ? '<ref>{{' + templateSelected + '}}</ref>' : '<ref></ref>';
				const reference = new ProveIt.Reference( referenceWikitext );
				this.viewForm( reference );
			},

			addTemplate() {
				const templateSelected = ProveIt.getCookie( 'template-selected' ); // Remember the last choice
				const templateWikitext = templateSelected ? '{{' + templateSelected + '}}' : '';
				const template = new ProveIt.Template( templateWikitext );
				this.viewForm( template );
			},

			viewList() {
				const list = [];
				let pageWikitext = ProveIt.getWikitext();

				// Get the references
				for ( const referenceWikitext of WikitextParser.getReferences( pageWikitext ) ) {
					const referenceIndex = pageWikitext.indexOf( referenceWikitext );
					const reference = new ProveIt.Reference( referenceWikitext, referenceIndex );
					if ( reference.extends ) {
						continue;
					}
					reference.reuses.forEach( ( reuse, index ) => reuse.letter = String.fromCharCode( 98 + index ) ); // 98 is the ASCII code for 'b', 99 for 'c', etc
					list.push( reference );

					// Replace the reference for a string of '@' of the same length
					// so we don't match its templates below and don't screw up indexes either
					pageWikitext = pageWikitext.replace( referenceWikitext, '@'.repeat( referenceWikitext.length ) );
				}

				// Get the citation templates
				let templateIndexOffset = 0;
				for ( const templateWikitext of WikitextParser.getTemplates( pageWikitext ) ) {
					const templateName = WikitextParser.getTemplateName( templateWikitext );
					const templateNameNormalized = ProveIt.normalizeTemplateName( templateName );
					if ( templateNameNormalized in ProveIt.templateData ) {
						const templateIndex = pageWikitext.indexOf( templateWikitext, templateIndexOffset );
						const template = new ProveIt.Template( templateWikitext, templateIndex );
						list.push( template );
						templateIndexOffset = templateIndex + templateWikitext.length;
					}
				}

				// Get the plain-text citations
				let citationIndexOffset = 0;
				for ( const listWikitext of WikitextParser.getLists( pageWikitext ) ) {
					for ( const itemWikitext of WikitextParser.getListItems( listWikitext ) ) {
						for ( const citationPattern of ProveIt.citationPatterns ) {
							const citationMatch = itemWikitext.match( citationPattern );
							if ( citationMatch ) {
								const citationWikitext = citationMatch[0];
								const citationIndex = pageWikitext.indexOf( citationWikitext, citationIndexOffset );
								const citation = new ProveIt.Template( citationWikitext, citationIndex );
								list.push( citation );
								citationIndexOffset = citationIndex + citationWikitext.length;
								break;
							}
						}
					}
				}

				// Sort the items by their order of appearance in the page wikitext
				list.sort( ( item1, item2 ) => item1.index - item2.index );

				this.list = list;
				this.form = null;
			},

			viewForm( object, index ) {
				if ( object.index !== undefined ) {
					this.highlight( object );
				}

				// Set the selected template
				let templateSelected;
				if ( object.type === 'reference' && object.template ) {
					templateSelected = object.template.name;
				} else if ( object.type === 'template' ) {
					templateSelected = object.name;
				}

				// Set the template options
				let templateOptions = Object.keys( ProveIt.templateData );
				// When editing a reference, exclude templates that shouldn't go inside <ref> tags
				const templatesNoRef = mw.config.get( 'proveit-templates-noref' );
				if ( object.type === 'reference' && templatesNoRef ) {
					templateOptions = templateOptions.filter( ( templateName ) => !templatesNoRef.includes( templateName ) );
				}
				// Sort alphabetically (case-insensitive)
				const contentLanguage = mw.config.get( 'wgContentLanguage' );
				templateOptions.sort( ( a, b ) => a.localeCompare( b, contentLanguage, { sensitivity: 'base' } ) );
				// If the main template is not found, put it first
				if ( templateSelected && !( templateSelected in ProveIt.templateData ) ) {
					templateOptions.unshift( templateSelected );
				}
				templateOptions = templateOptions.map( ( templateName ) => ( { value: templateName } ) );

				// Set the template fields
				let templateFields;
				if ( object.type === 'reference' && object.template ) {
					templateFields = object.template.getFields();
				} else if ( object.type === 'template' ) {
					templateFields = object.getFields();
				}

				// Set the input to generate an automatic citation
				let generateInput;
				const input = object.type === 'reference' ? object.content : object.wikitext;
				if ( input.includes( ' ' ) ) {
					for ( const citationPattern of ProveIt.citationPatterns ) {
						if ( citationPattern.test( input ) ) {
							generateInput = input;
							break;
						}
					}
				} else if ( !/^{{.+}}$/.test( input ) ) {
					generateInput = input;
				}

				this.form = {
					object: object,
					index: index,
					generateInput: generateInput,
					templateOptions: templateOptions,
					templateSelected: templateSelected,
					templateFields: templateFields
				};
			},

			previousItem() {
				const index = this.form.index - 1;
				const object = this.list[ index ];
				this.viewForm( object, index );
			},

			nextItem() {
				const index = this.form.index + 1;
				const object = this.list[ index ];
				this.viewForm( object, index );
			},

			filterList( event ) {
				const input = event.target;
				const filter = input.value.toLowerCase();
				$( '#proveit-list' ).find( '.proveit-item' ).hide().filter( ( index, element ) => element.textContent.toLowerCase().includes( filter ) ).show();
			},

			filterFields( event ) {
				const input = event.target;
				const filter = input.value.toLowerCase();
				$( '#proveit-form' ).find( '.cdx-field' ).hide().filter( ( index, element ) => element.textContent.toLowerCase().includes( filter ) ).show();
			},

			showAll( event ) {
				const button = event.target;
				button.remove();
				for ( const field of this.form.templateFields ) {
					field.visible = true;
				}
			},

			// @todo Improve
			async onWikiPageNameInput( value, field ) {
				const response = await new mw.Api( { userAgent: ProveIt.userAgent } ).get( {
					action: 'opensearch',
					search: value,
					limit: 5,
					redirects: 'resolve',
					format: 'json',
					formatversion: 2
				} );
				field.suggestions = [];
				const titles = response[ 1 ];
				for ( const title of titles ) {
					field.suggestions.push( { value: title } );
				}
			},

			async archiveURL( event, field ) {
				field.status = 'default'; // Reset the status

				// Make sure there's some input
				const button = event.target;
				const input = button.nextElementSibling.querySelector( 'input' );
				const value = input.value;
				if ( !value ) {
					input.focus();
					return;
				}

				// Hint the user that something is happening and disable the button to prevent further clicks
				button.textContent = mw.msg( 'proveit-archive-fetching' );
				button.disabled = true;

				try {
					const data = await $.getJSON( 'https://archive.org/wayback/available?url=' + encodeURIComponent( value ) );
					const snapshot = data.archived_snapshots.closest;
					if ( snapshot ) {
						const url = snapshot.url;
						const date = this.normalizeDate( snapshot.timestamp );
						field.status = 'success';
						field.messages = { success: mw.msg( 'proveit-archive-success', url, date ) };
						const aliases = this.form.object.template.getParamAliases();
						for ( const field of this.form.templateFields ) {
							if ( field.name === 'archive-url' || field.name === aliases[ 'archive-url' ] ) {
								field.value = url;
								field.visible = true;
								this.onTemplateFieldChange( field );
							}
							if ( field.name === 'archive-date' || field.name === aliases[ 'archive-date' ] ) {
								field.value = date;
								field.visible = true;
								this.onTemplateFieldChange( field );
							}
						}
					} else {
						field.status = 'warning';
						field.messages = { warning: mw.msg( 'proveit-archive-not-found' ) };
					}
				} catch ( error ) {
					field.status = 'warning';
					field.messages = { warning: mw.msg( 'proveit-archive-error' ) };
				}

				// Reset the button
				button.textContent = mw.msg( 'proveit-archive-button' );
				button.disabled = false;
			},

			onTodayButtonClick( field ) {
				const date = new Date();
				const value = date.toString();
				field.value = this.normalizeDate( value );
				this.onTemplateFieldChange( field );
			},

			onNormalizeDateButtonClick( field ) {
				field.value = this.normalizeDate( field.value );
				this.onTemplateFieldChange( field );
			},

			normalizeDate( value ) {
				value = value.trim();

				// Wayback Machine and MediaWiki timestamps (T342221)
				const match = value.match( /^(\d{4})(\d{2})(\d{2})\d{6}$/ );
				if ( match ) {
					value = match[1] + '-' + match[2] + '-' + match[3];
				}

				// Return the date in the preferred format
				const date = new Date( value );
				const format = mw.config.get( 'proveit-date-format' );
				if ( format ) {
					format.timeZone = 'UTC'; // Force UTC
					if ( /^\d{4}$/.test( value ) ) {
						delete format.month;
						delete format.day;
					} else if ( /^\d{4}\D\d{2}$/.test( value ) ) {
						delete format.day;
					}
					const contentLanguage = mw.config.get( 'wgContentLanguage' );
					const formatter = new Intl.DateTimeFormat( contentLanguage, format );
					return formatter.format( date );

				// If no format is given, assume YYYY-MM-DD which is the preferred format by most wikis
				} else {
					const year = date.getUTCFullYear();
					const month = ( date.getUTCMonth() + 1 ).toString().padStart( 2, '0' );
					const day = date.getUTCDate().toString().padStart( 2, '0' );
					if ( /^\d{4}$/.test( value ) ) {
						return year;
					} else if ( /^\d{4}\D\d{2}$/.test( value ) ) {
						return year + '-' + month;
					} else {
						return year + '-' + month + '-' + day;
					}
				}
			},

			onReferenceNameChange() {
				const reference = this.form.object;
				if ( reference.name ) {
					this.form.referenceNameStatus = 'default';
				} else if ( reference.reuses.length || reference.subrefs.length ) {
					this.form.referenceNameStatus = 'warning';
					this.form.referenceNameMessages = { warning: mw.msg( 'proveit-reference-name-warning' ) };
				}
			},

			onReferenceContentChange() {
				const reference = this.form.object;
				reference.template = reference.getTemplate();
				this.form.templateSelected = reference.template ? reference.template.name : null;
				this.form.templateFields = reference.template ? reference.template.getFields() : null;
			},

			onTemplateSelect() {
				const templateSelected = this.form.templateSelected;
				ProveIt.setCookie( 'template-selected', templateSelected );
				const object = this.form.object;
				if ( object.type === 'reference' ) {
					if ( object.template ) {
						object.template.name = templateSelected;
						const oldTemplate = object.getTemplate();
						const oldTemplateWikitext = oldTemplate.wikitext;
						const newTemplateWikitext = object.template.toWikitext();
						object.content = object.content.replace( oldTemplateWikitext, newTemplateWikitext );
					} else {
						const newTemplateWikitext = '{{' + templateSelected + '}}';
						object.content += newTemplateWikitext;
						object.template = object.getTemplate();
					}
					this.form.templateFields = object.template.getFields();
				} else {
					object.name = templateSelected;
					this.form.templateFields = object.getFields();
				}
			},

			onTemplateFieldChange( field ) {
				const object = this.form.object;
				if ( object.type === 'reference' ) {
					object.template.params[ field.name ] = field.value;
					const oldTemplate = object.getTemplate();
					const oldTemplateWikitext = oldTemplate.wikitext;
					const newTemplateWikitext = object.template.toWikitext();
					object.content = object.content.replace( oldTemplateWikitext, newTemplateWikitext );
				} else {
					object.params[ field.name ] = field.value;
				}
			},

			/**
			 * Add the ProveIt summary, hash and change tag
			 * @todo Avoid jQuery?
 			 */
			addSummary() {
				const proveitTag = mw.config.get( 'proveit-tag' ); // For tracking via Special:Tags
				const proveitHash = '#proveit'; // For tracking via https://hashtags.wmcloud.org
				const proveitSummary = mw.config.get( 'proveit-summary' );
				let $summary, summary;
				switch ( ProveIt.getEditor() ) {
					case 'core':
					case 'wikieditor':
					case 'codemirror':
						$summary = $( '#wpSummary' );
						summary = $summary.val().trim();
						if ( summary ) {
							if ( !summary.includes( proveitHash ) ) {
								summary += ' ' + proveitHash;
							}
						} else {
							summary = proveitSummary + ' ' + proveitHash;
						}
						$summary.val( summary );
						if ( proveitTag ) {
							let $tagInput = $( '#wpChangeTags' );
							if ( $tagInput.length ) {
								const tags = $tagInput.val();
								if ( !tags.includes( proveitTag ) ) {
									$tagInput.val( tags + ',' + proveitTag );
								}
							} else {
								$tagInput = $( '<input>' ).attr( {
									id: 'wpChangeTags',
									type: 'hidden',
									name: 'wpChangeTags',
									value: proveitTag
								} );
								$( '#editform' ).prepend( $tagInput );
							}
						}
						break;

					case 'source':
						$( document ).on( 'focus', '.ve-ui-mwSaveDialog-summary textarea', function () {
							$summary = $( this );
							summary = $summary.val().trim();
							if ( summary ) {
								if ( !summary.includes( proveitHash ) ) {
									summary += ' ' + proveitHash;
								}
							} else {
								summary = proveitSummary + ' ' + proveitHash;
							}
							$summary.val( summary );
						} );
						if ( proveitTag ) {
							ve.init.target.saveFields.wpChangeTags = () => {
								return proveitTag;
							};
						}
						break;
				}
			}
		}
	},

	/**
	 * Template class
	 * @note When given a non-template wikitext, this class doesn't fail,
	 * but rather produces a template object with empty name and params
	 * This quirk allows us to handle plain-text citations as if they were templates.
	 * @class
	 */
	Template: class {

		/**
		 * Constructor
		 * @param {string} wikitext Wikitext of the template
		 * @param {number} index Initial position of the template
		 */
		constructor( wikitext, index ) {
			this.type = 'template';
			this.wikitext = wikitext;
			this.index = index;
			this.name = WikitextParser.getTemplateName( wikitext );
			this.params = WikitextParser.getTemplateParameters( wikitext );
			this.snippet = this.getSnippet();
		}

		/**
		 * Get the template data for this template
		 * @return {Object} Template data for this template
		 */
		getTemplateData() {
			let templateData = {};
			if ( this.name ) {
				const templateNameNormalized = ProveIt.normalizeTemplateName( this.name );
				if ( templateNameNormalized in ProveIt.templateData ) {
					templateData = ProveIt.templateData[ templateNameNormalized ];
				}
			}
			return templateData;
		}

		/**
		 * Get the data for the form fields of this template
		 * @return {Array}
		 */
		getFields() {
			const fields = [];

			// First determine the param order
			const templateData = this.getTemplateData();
			const paramOrder = templateData.paramOrder || ( templateData.params && Object.keys( templateData.params ) ) || [];
			const paramAliases = this.getParamAliases();
			for ( const paramName in this.params ) {
				if ( !paramOrder.includes( paramName ) && !( paramName in paramAliases ) ) {
					paramOrder.push( paramName );
				}
			}

			// Then proceed in order
			const userLanguage = mw.config.get( 'wgUserLanguage' );
			const wikiLanguage = mw.config.get( 'wgContentLanguage' );
			for ( const paramName of paramOrder ) {

				// Set the defaults
				const fieldName = paramName;
				const fieldValue = this.params[ fieldName ] || null;
				const field = {
					name: fieldName,
					value: fieldValue,
					label: fieldName,
					type: null,
					tooltip: null,
					required: false,
					suggested: false,
					deprecated: false,
					visible: true,
					suggestions: []
				};

				// Override with template data if there's any
				if ( templateData.params && templateData.params[ paramName ] ) {
					const paramData = templateData.params[ paramName ];
					field.type = paramData.type;
					field.label = paramData.label && ( paramData.label[ userLanguage ] || paramData.label[ wikiLanguage ] );
					field.tooltip = paramData.description && ( paramData.description[ userLanguage ] || paramData.description[ wikiLanguage ] );
					field.required = paramData.required;
					field.suggested = paramData.suggested;
					field.deprecated = paramData.deprecated;
					field.class = { required: field.required, suggested: field.suggested, deprecated: field.deprecated };
					field.suggestions = paramData.suggestedvalues;
					if ( !field.value && paramData.aliases ) {
						for ( const paramAlias of paramData.aliases ) {
							if ( this.params[ paramAlias ] ) {
								field.name = paramAlias;
								field.value = this.params[ paramAlias ];
								break;
							}
						}
					}
					field.visible = field.value || field.required || field.suggested ? true : false;
				}

				fields.push( field );
			}
			return fields;
		}

		/**
		 * Get a map from parameter aliases to canonical parameter names
		 * @return {Object} Map from parameter aliases to canonical parameter names
		 */
		getParamAliases() {
			const paramAliases = {};
			const templateData = this.getTemplateData();
			for ( const paramName in templateData.params ) {
				const paramData = templateData.params[ paramName ];
				if ( paramData.aliases ) {
					for ( const paramAlias of paramData.aliases ) {
						paramAliases[ paramAlias ] = paramName;
					}
				}
			}
			return paramAliases;
		}

		/**
		 * Get the snippet for this template
		 * @return {string} Snippet for this template
		 */
		getSnippet() {
			let snippet = this.toWikitext();
			const templateData = this.getTemplateData();
			for ( const paramName in this.params ) {
				if ( templateData.params && paramName in templateData.params ) {
					const paramData = templateData.params[ paramName ];
					const paramType = paramData.type;
					if ( paramData.required && paramType === 'string' || paramType === 'content' ) {
						const paramValue = this.params[ paramName ];
						snippet = paramValue;
						break;
					}
				}
			}
			// T415928
			if ( ProveIt.normalizeTemplateName( this.name ) === 'Cite book' && this.params.chapter ) {
				snippet += ' — ' + this.params.chapter;
			}
			return snippet;
		}

		/**
		 * Convert this template model into template wikitext
		 * @return {string} Template wikitext
		 */
		toWikitext() {
			let wikitext = this.wikitext;
			if ( this.name ) {
				wikitext = '{{' + this.name;

				// First determine the param order
				const templateData = this.getTemplateData();
				const paramOrder = templateData.paramOrder || ( templateData.params && Object.keys( templateData.params ) ) || [];
				const paramAliases = this.getParamAliases();
				for ( const paramName in this.params ) {
					if ( !paramOrder.includes( paramName ) && !( paramName in paramAliases ) ) {
						paramOrder.push( paramName );
					}
				}

				// Then proceed in order
				for ( let paramName of paramOrder ) {
					if ( !( paramName in this.params ) ) {
						for ( const paramAlias in paramAliases ) {
							if ( paramName === paramAliases[ paramAlias ] && paramAlias in this.params ) {
								paramName = paramAlias;
								break;
							}
						}
					}
					const paramValue = this.params[ paramName ];
					if ( paramValue ) {
						wikitext += templateData.format === 'block' ? '\r\n| ' : ' |';
						wikitext += /^\d+$/.test( paramName ) ? paramValue : paramName + '=' + paramValue;
					}
				}

				wikitext += templateData.format === 'block' ? '\r\n}}' : '}}';
			}
			return wikitext;
		}
	},

	/**
	 * Reference class
	 * @class
	 */
	Reference: class {

		/**
		 * Constructor
		 * @param {string} wikitext Wikitext of the reference
		 * @param {number} index Initial position of the template
		 */
		constructor( wikitext, index ) {
			this.type = 'reference';
			this.wikitext = wikitext;
			this.index = index;
			this.name = WikitextParser.getTagAttribute( wikitext, 'name' );
			this.group = WikitextParser.getTagAttribute( wikitext, 'group' );
			this.extends = WikitextParser.getTagAttribute( wikitext, 'extends' );
			this.content = WikitextParser.getTagContent( wikitext );
			this.template = this.getTemplate();
			this.snippet = this.getSnippet();
			this.reuses = this.getReuses();
			this.subrefs = this.getSubrefs();
		}

		/**
		 * Get the snippet for this reference
		 * @return {string|null} Snippet for this reference or null if there's no content
		 */
		getSnippet() {
			if ( this.content ) {
				let snippet = this.content;
				const template = this.getTemplate();
				if ( template ) {
					const templateSnippet = template.getSnippet();
					if ( templateSnippet ) {
						snippet = templateSnippet;
					}
				}
				return snippet;
			}
		}

		/**
		 * Get the main citation template of this reference
		 * @return {ProveIt.Template|null} Citation template or null if there's none
		 */
		getTemplate() {
			if ( this.content ) {
				for ( const templateWikitext of WikitextParser.getTemplates( this.content ) ) {
					const templateName = WikitextParser.getTemplateName( templateWikitext );
					const templateNameNormalized = ProveIt.normalizeTemplateName( templateName );
					if ( templateNameNormalized in ProveIt.templateData ) {
						return new ProveIt.Template( templateWikitext );
					}
				}
			}
		}

		/**
		 * Get all the reuses of this reference
		 * @return {ProveIt.Reference[]} Array of Reference objects
		 */
		getReuses() {
			const reuses = [];
			if ( this.name && this.content ) {
				const pageWikitext = ProveIt.getWikitext();
				const reuseRegExp = /<ref[^/]*\/>/ig;
				let reuseMatch;
				while ( ( reuseMatch = reuseRegExp.exec( pageWikitext ) ) ) {
					const reuseWikitext = reuseMatch[0];
					const reuseIndex = reuseMatch.index;
					const reuse = new ProveIt.Reference( reuseWikitext, reuseIndex );
					if ( this.name === reuse.name ) {
						reuses.push( reuse );
					}
				}
			}
			return reuses;
		}

		/**
		 * Get all the sub-references of this reference
		 * @return {ProveIt.Reference[]} Array of Reference objects
		 */
		getSubrefs() {
			const subrefs = [];
			if ( this.name && this.content ) {
				const pageWikitext = ProveIt.getWikitext();
				let subrefIndexOffset = 0;
				for ( const subrefWikitext of WikitextParser.getReferences( pageWikitext ) ) {
					const subrefExtends = WikitextParser.getTagAttribute( subrefWikitext, 'extends' );
					if ( subrefExtends && this.name === subrefExtends ) {
						const subrefIndex = pageWikitext.indexOf( subrefWikitext, subrefIndexOffset );
						const subref = new ProveIt.Reference( subrefWikitext, subrefIndex );
						subrefs.push( subref );
						subrefIndexOffset = subrefIndex + subrefWikitext.length;
					}
				}
			}
			return subrefs;
		}

		/**
		 * Convert this reference model into reference wikitext
		 * @return {string} Reference wikitext
		 */
		toWikitext() {
			let wikitext = '<ref';
			if ( this.name ) {
				wikitext += ' name="' + this.name + '"';
			}
			if ( this.group ) {
				wikitext += ' group="' + this.group + '"';
			}
			if ( this.extends ) {
				wikitext += ' extends="' + this.extends + '"';
			}
			if ( this.content ) {
				if ( this.template ) {
					this.content = this.content.replace( this.template.wikitext, this.template.toWikitext() );
				}
				wikitext += '>' + this.content + '</ref>';
			} else {
				wikitext += ' />';
			}
			return wikitext;
		}
	},

	/**
	 * Convenience method to detect the current editor
	 * @return {string|null} Name of the editor or null if it's not supported
	 */
	getEditor() {
		if ( window.ve && ve.init && ve.init.target && ve.init.target.active ) {
			if ( ve.init.target.getSurface().getMode() === 'source' ) {
				return 'source'; // 2017 wikitext editor
			}
		}
		const action = mw.config.get( 'wgAction' );
		if ( action === 'edit' || action === 'submit' ) {
			if ( mw.user.options.get( 'usebetatoolbar' ) === 1 ) {
				if ( $( '.CodeMirror' ).length ) {
					return 'codemirror'; // CodeMirror
				}
				return 'wikieditor'; // WikiEditor
			}
			return 'core'; // Core editor
		}
	},

	/**
	 * Convenience method to get the wikitext of the current page
	 * @return {string} Wikitext of the current page
	 */
	getWikitext() {
		return $( '#wpTextbox1' ).textSelection( 'getContents' );
	},

	/**
	 * Helper method to normalize the name of a template
	 * @param {string} templateName Template name
	 * @return {string} Normalized template name
	 */
	normalizeTemplateName( templateName ) {
		templateName = templateName.trim();
		templateName = templateName.charAt( 0 ).toUpperCase() + templateName.slice( 1 ); // Capitalize the first letter
		templateName = templateName.replaceAll( '_', ' ' );
		if ( templateName in ProveIt.templateAliases ) {
			templateName = ProveIt.templateAliases[ templateName ];
		}
		return templateName;
	},

	/**
	 * Helper method to set a cookie
 	 * @param {string} key Key of the cookie to set
	 * @param {string} value Value of the cookie to set
	 */
	setCookie( key, value ) {
		const cookie = mw.cookie.get( 'Proveit' );
		const data = cookie ? JSON.parse( cookie ) : {};
		data[ key ] = value;
		const json = JSON.stringify( data );
		mw.cookie.set( 'Proveit', json );
	},

	/**
	 * Helper method to get a cookie
 	 * @param {string} key Key of the cookie to get
	 * @return {string} Value of the cookie
	 */
	getCookie( key ) {
		const cookie = mw.cookie.get( 'Proveit' );
		const data = cookie ? JSON.parse( cookie ) : {};
		return data[ key ];
	}
};

mw.loader.using( [
	'mediawiki.api',
	'mediawiki.cookie',
	'jquery.textSelection',
	'jquery.ui'
], ProveIt.init );

// </nowiki>
