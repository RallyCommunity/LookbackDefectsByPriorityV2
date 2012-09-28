(function() {

    // TODO make this configurable
    var openStates = ["Submitted", "Open"];

    //TODO remove this and use the standard store when the new Lookback API url format is online
    Ext.define('Rally.data.lookback.SnapshotStoreOldUrl', {
        extend: 'Rally.data.lookback.SnapshotStore',

        constructor: function(config) {
            this.callParent([config]);
            // temporary override needed since new URL format not deployed yet
            this.proxy.url = Rally.environment.getServer().getLookbackUrl(1.37) + '/' +
                    Rally.util.Ref.getOidFromRef(this.context.workspace) + '/artifact/snapshot/query';
        }
    });

    /**
     * A chart that render the number of defects of each priority between defectsByPriorityConfig.startDate and defectsByPriorityConfig.endDate, which is a required field of the config object.
     */
	Ext.define('Rally.ui.chart.DefectsByPriorityChart', {
        extend: 'Rally.ui.chart.Chart',
        alias: 'widget.rallydefectsbyprioritychart',

        config: {
            /**
             * @cfg {Object} defectsByPriorityConfig (required) The configuration specific to the defects by priority chart
             * @cfg {Date} defectsByPriorityConfig.startDate (required) The start of the time period to report on
             * @cfg {Date} defectsByPriorityConfig.endDate (required) The end of the time period to report on
             */
            defectsByPriorityConfig: {
                startDate: null,
                endDate: null
            },

            storeType: 'Rally.data.TransformStore',
            storeConfig: {

                //TODO Revert back to Rally.data.lookback.SnapshotStore when new Lookback API url formaat is online
                wrappedStoreType: 'Rally.data.lookback.SnapshotStoreOldUrl',

                /**
                 * @cfg {Object} storeConfig The configuration used to filter the data
                 * retrieved from the Lookback API
                 */
                wrappedStoreConfig: {
                    sorters: [
                        {
                            property: 'ObjectID',
                            direction: 'ASC'
                        },
                        {
                            property: '_ValidFrom',
                            direction: 'ASC'
                        }
                    ],
                    hydrate: ['Priority'],
                    fetch: ['ObjectID', 'Priority'],

                    // look for snapshots of defects that changed State
                    filters: [
                        { property: '_Type', value: 'Defect' },
                        { property: 'State', operator: 'in', value: openStates },
                        { property: '_PreviousValues.State', operator: 'exists', value: true }
                    ],
                    limit: Infinity
                },

                autoLoad: false,

                transform: {

                    config: {
                        allPriorities: null,
                        groupBySpec: {
                            groupBy: 'Priority',
                            aggregations: [
                                {
                                    field: 'ObjectID',
                                    f: '$count'
                                }
                            ]
                        }
                    },

                    method: function(records, transformConfig){

                        var objects = Ext.Array.pluck(records, 'raw');
                        var uniques = this._getUniqueSnapshots(objects);

                        var groupsObj = Rally.data.util.Transform.groupBy(uniques, transformConfig.groupBySpec);
                        var resultsArray = this.changeGroupingsToMatchPriorities(groupsObj, transformConfig.allPriorities);

                        return resultsArray;
                    },

                    /**
                     * Assumes that results is sorted on ObjectID ASC and then _ValidFrom ASC in order to get last
                     * unique snapshot for each ObjectID.
                     */
                    _getUniqueSnapshots: function(results){
                        var uniques = [];
                        var previous = null;
                        var l = results.length;
                        for(var i=0; i < l; ++i){
                            var result = results[i];
                            var oid = result.ObjectID;
                            if(previous !== null && oid !== previous.ObjectID){
                                uniques.push(previous);
                            }
                            previous = result;
                        }
                        // make sure we get the last one
                        if(previous !== null){
                            uniques.push(previous);
                        }

                        return uniques;
                    },

                    /**
                     * Ensures that the groupings are in the same order as the list of priorities and adds zeros for missing ones.
                     */
                    changeGroupingsToMatchPriorities: function(groupsObj, allPriorities){
                        var results = [];

                        var l = allPriorities.length;
                        for(var i=0; i < l; ++i){
                            var priority = allPriorities[i];
                            var count;
                            if(groupsObj[priority]){
                                count = groupsObj[priority].ObjectID_$count;
                            }
                            else{
                                count = 0;
                            }

                            results.push({ count: count });
                        }

                        return results;
                    }

                }

            },


            /**
             * @cfg {Object} chartConfig The HighCharts chart config defining all the chart options.
             * Full documentation here: [http://www.highcharts.com/ref/](http://www.highcharts.com/ref/)
             */
            chartConfig: {
                chart: {
                    defaultSeriesType: 'column',
                    zoomType: 'x'
                },
                legend: {
                    enabled: false
                },
                title: {
                    text: "Defects By Priority"
                },
                xAxis: {
                    categories: [],
                    tickmarkPlacement: 'on',
                    tickInterval: 1,
                    title: {
                        enabled: 'Priority'
                    }

                },
                tooltip: {
                    formatter: function() {
                        return ' '+ this.x + ': ' + this.y;
                    }
                },
                plotOptions : {
                    column: {
                        color: '#F00'
                    }
                }
            },
            series: [
                {
                    type : 'column',
                    name: 'Count',
                    yField: 'count'
                }
            ]

		},

		//TODO
		/*
		colorMap: {
            'High Attention': '#FF0000',

        },
        */

        constructor: function(config) {
            this._ensureStartAndEndConfigured(config);

            this.callParent(arguments);

            // needs to come after parent call so that default config is merged in
            this._ensureContextConfigured(config);

            this._requestDefectTypeDef();

            var projectOID = new Rally.util.Ref(this.context.project).getOid();

            // get snapshots that happened during the date range in the current project
            this.storeConfig.wrappedStoreConfig.filters = Ext.Array.union(this.storeConfig.wrappedStoreConfig.filters, [
                {
                    property: '_ValidFrom',
                    operator: '>=',
                    value: Rally.util.DateTime.toIsoString(this.defectsByPriorityConfig.startDate, true)
                },
                {
                    property: '_ValidFrom',
                    operator: '<',
                    value: Rally.util.DateTime.toIsoString(this.defectsByPriorityConfig.endDate, true)
                },
                {
                    property: 'Project',
                    value: projectOID
                }
            ]);
        },

        _ensureStartAndEndConfigured: function(config){
            if(!config.defectsByPriorityConfig){
                throw new Error("Config property 'defectsByPriorityConfig' must be set.");
            }

            var defectsByPriorityConfig = config.defectsByPriorityConfig;

            if(Ext.typeOf(defectsByPriorityConfig.startDate) !== 'date'){
                throw new Error("Config property 'defectsByPriorityConfig.startDate' must be set.");
            }

            if(Ext.typeOf(defectsByPriorityConfig.endDate) !== 'date' ){
                throw new Error("Config property 'defectsByPriorityConfig.endDate' must be set.");
            }

        },

        _ensureContextConfigured: function(config){
            if(!config.context){
                throw new Error("Config property 'context' must be set.");
            }

            // ensure the snapshot store has the context
            this.storeConfig.wrappedStoreConfig.context = config.context;
        },

        _requestDefectTypeDef: function(){
            //TODO Change this to use a Rally.data.WsapiDataStore

            var queryUrl = "https://rally1.rallydev.com/slm/webservice/1.36/typedefinition.js";

            var params = {
                query: '( Name = "Defect" )',
                fetch: 'ObjectID,Name,Attributes,AllowedValues',
                start: '1',
                pagesize: '1'
            };

            var callback = Ext.bind(this._extractDefectPriorities, this);
            Ext.Ajax.request({
                url: queryUrl,
                method: 'GET',
                params: params,
                withCredentials: true,
                success: function(response){
                    var text = response.responseText;
                    var json = Ext.JSON.decode(text);
                    callback(json.QueryResult.Results[0]);
                }
            });
        },

        /**
         * Sets the defectPriorities field to the set of allowed values (Strings) for the Priority field of the given type definition
         */
        _extractDefectPriorities: function(defectTypeDef){
            // find the Priority attribute definition
            var stateAttDef = Ext.Array.filter(defectTypeDef.Attributes, function(attribute){
                return attribute.Name === "Priority";
            }, null)[0];

            // pull out all its alllowed values
            this.defectPriorities = Ext.Array.pluck(stateAttDef.AllowedValues, "StringValue");

            // tell highcharts
            this.chartConfig.xAxis.categories = this.defectPriorities;

            // tell the store
            this.storeConfig.transform.config.allPriorities = this.defectPriorities;

            // render the chart if we've already loaded highcharts
            if(this.highchartsLoaded){
                this._drawChartWhenRendered();
            }
        },

        _onAfterLoadDependencies: function() {
            this.highchartsLoaded = true;

            // render the chart if we've already loaded the defectPriorities
            if(this.defectPriorities){
                this._drawChartWhenRendered();
            }

        },

        _drawChartWhenRendered: function(){
            if (!this.rendered) {
                this.on('afterrender', this._drawChart, this);
            } else {
                this._drawChart();
            }
        },

        prepareChartData: function(store, results){

            //TODO HACK ensure the data field is set on all the models, since Joe Kuan uses data instead of raw
            this.store.each(function(record){
                record.data = record.raw;
            });
        },

        renderChart: function(config){
            this._highChart = this.add(Ext.apply({
                xtype:'highchart',
                chartConfig: this.chartConfig,

                //TODO figure out how to change chart/Chart get these
                store: this.store,
                series: this.series

            }, config || {}));

        }

	});
}());
