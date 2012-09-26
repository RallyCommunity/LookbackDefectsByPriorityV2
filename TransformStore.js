(function() {
    var Ext = window.Ext4 || window.Ext;

    var DEFAULT_WRAPPED_STORE_TYPE = 'Rally.data.custom.Store';

    Ext.define('Rally.data.TransformStore', {
        extend: 'Rally.data.custom.Store',
        alias: 'store.rallytransformstore',

        requires: [
            'Rally.data.custom.Store',
            'Rally.data.util.Transform'
        ],

        config: {

            /**
             * @cfg {Ext.data.Store / string} The store instance to wrap.
             * If not specified, a store of type {@link #config.wrappedStoreType} is created.
             */
            wrappedStore: null,

            /**
             * @cfg {string} The fully qualified name of the store to create, if {@link #config.wrappedStore} isn't supplied.
             */
            wrappedStoreType: DEFAULT_WRAPPED_STORE_TYPE,

            /**
             * @cfg {Object} The configuration for the wrapped store being instantiated, if {@link #config.wrappedStore} isn't supplied.
             */
            wrappedStoreConfig: {
                fields: [],
                data: []
            },

            /**
             * @cfg {Object} The configuration for the data transformation that is to be applied to the store data.
             */
            transform: {
                /**
                 * @cfg {string / function(Object[], (Object|Array))} transform.method (required) The transformation function to apply to the wrapped store's records.
                 * This has the possible values of "aggregate", "multiAggregate", "groupBy" and "multiGroupBy" or you can pass a function
                 * which takes the parameters records and transformConfig.
                 * When one of the above predefined functions is given, a config property must also be supplied.
                 */
                method: Ext.emptyFn,

                /**
                 * @cfg {Object / Object[]} transform.config The configuration to pass to to the transformation function.
                 * If you are using one of the predefined functions, this must be supplied.
                 * {@link Rally.data.util.Transform} for the corresponding spec objects to be passed for these methods.
                 */
                config: null
            },


            /**
             * The set of fields for the data.  If not supplied, they are inferred from the first result of the aggregation
             */
            fields: [],

            data: []
        },

        constructor: function(config) {

            this.mergeConfig(config);

            config.fields = config.fields || [];

            if(config.data){
                console.warn("TransformStore doesn't accept a data parameter in its config, ignoring.");
            }

            // must be empty since we're loading it from the wrapped store
            config.data = [];

            if(config.wrappedStore){
                this.wrappedStore = this._initFromWrappedStore(config.wrappedStore);
            }
            else if(config.wrappedStoreConfig){
                var wrappedStoreType = config.wrappedStoreType || DEFAULT_WRAPPED_STORE_TYPE;
                this.wrappedStore = this._initFromWrappedStoreConfig(config.wrappedStoreConfig, wrappedStoreType);
            }

            if( !(this.wrappedStore instanceof Ext.data.AbstractStore) ){
                throw new Error("Couldn't find wrapped store for TransformStore");
            }

            this._addWrappedStoreListeners();

            this._validateTransform();

            this._ensureLumenizeLoaded();

            //TODO figure out how to prevent initial load from parent's constructor (since will fire load event early)
            // could use some sort of once/one-off listener that consumes the event?
            //this.on('load', function(event){ return false; }, null, { single: true });
            // could also try this.suspendEvents(false), but that might stop ones we want, like afterrender?
            this.suspendEvents(false);
            this.callParent([config]);
            this.resumeEvents();

            //TODO figure out why load seems to fire 3 times

            if(this.autoLoad){
                this.wrappedStore.load();
            }
        },

        _initFromWrappedStore: function(wrappedStore){
            if(typeof wrappedStore === 'string'){
                return Ext.data.StoreManager.lookup(wrappedStore);
            }

            // assume it's a store instance
            return wrappedStore;
        },

        _initFromWrappedStoreConfig: function(wrappedStoreConfig, wrappedStoreType){
            return Ext.create(wrappedStoreType, wrappedStoreConfig);
        },

        _validateTransform: function(){
            if(!this.transform){
                throw new Error("Required config parameter transform is missing or null, cannot instantiate TransformStore");
            }

            if(!this.transform.method){
                throw new Error("Required config parameter transform.method is missing or null, cannot instantiate TransformStore");
            }

            var methodType = typeof this.transform.method;
            if(methodType === "string"){
                var methodName = this.transform.method.trim();
                // forbid private methods
                if( methodName.indexOf('_' === 0) ){
                    throw new Error("Required config parameter transform.method is attemping to call private method '"+ methodName +
                                     "', cannot instantiate TransformStore");
                }

                if( !(Rally.data.util.Transform[methodName]) ){
                    throw new Error("Required config parameter transform.method is calling an invalid function '"+ methodName +
                                    ", cannot instantiate TransformStore");
                }

                // must be predefined if we made it this far, so require a config (since they all need one)
                if( !this.transform.config ){
                    throw new Error("Config parameter transform.config is required when transform.method is a string, cannot instantiate TransformStore");
                }

                // make the method property hold the right function
                this.transform.method = Ext.bind(Rally.data.util.Transform[methodName], Rally.data.util.Transform);
            }
            else if(methodType !== "function"){
                throw new Error("Required config parameter transform.method is invalid, it must be either a string or a function, cannot instantiate TransformStore");
            }
        },

        _addWrappedStoreListeners: function(){
            this.wrappedStore.mon(this.wrappedStore, 'load', this.onWrappedStoreLoad, this);
        },

        onWrappedStoreLoad: function(store, records){
            this.aggregateLoadedData(store, records);
        },

        _ensureLumenizeLoaded: function(){
            // highcharts and lumenize are disabled in ALM (only available in SDK), so this stops it blowing up
            if ( !(window._lumenize) ) {
                // we're screwed
                throw new Error("Couldn't load necessary dependencies for TransformStore, window._lumenize not in scope");
            }
        },

        aggregateLoadedData: function(wrappedStore, records){
            var transformedRecords = this.transform.method(records, this.aggregationSpec);

            this._deriveFields(transformedRecords);

            this._setFieldsFromData(transformedRecords);

            this.loadData(transformedRecords);
        },

        _deriveFields: function(records){

            if(this.fields === undefined || this.fields === null){
                this.fields = [];
            }

            if(records && records.length > 0){
                this._setFieldsFromData(records);
            }
            else{
                // give up
                console.warn("Couldn't determine fields for TransformStore with no data, please set fields config parameter.");
            }
        },

        _setFieldsFromData: function(records){
            Ext.Object.each(records[0], function(key, value) {
                    this.fields.push( { name: key });
                }, this);
        }
    });

}());
