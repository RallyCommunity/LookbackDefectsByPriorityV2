Ext.create('rallytransformstore', {

    wrappedStoreType: 'Rally.data.lookback.SnapshotStore',
    wrappedStoreConfig: {
        fetch: ['Name', 'ScheduleState'],
        filters: [
            {
                property: '_Type',
                operator: 'in',
                value: ['Defect', 'HierarchicalRequirement']
            }
        ],

        listeners: {
            'load': this.onAggregationLoad
        }
    },

    transform: {

        config: [
            { field: 'ObjectID', f: '$count' },
            { as: 'Drill-down', field:'ObjectID', f:'$push' },
            { field: 'PlanEstimate', f: '$sum' },
            { as: 'mySum', field: 'PlanEstimate', f: function(values){
                return Ext.Array.sum(values);
              }
            },
            { as: 'simplerSum', field: 'PlanEstimate', f: Ext.Array.sum }
        ],

        method: function(records, transformConfig){
            this.helperFunction();
            Rally.data.util.Transform.aggregate(records, transformConfig);

        },


        helperFunction: function(records){

        }
    }

});


/*
 aggregationSpec: [
        { field: 'ObjectID', f: '$count' },
        { as: 'Drill-down', field:'ObjectID', f:'$push' },
        { field: 'PlanEstimate', f: '$sum' },
        { as: 'mySum', field: 'PlanEstimate', f: function(values){
            return Ext.Array.sum(values);
          }
        },
        { as: 'simplerSum', field: 'PlanEstimate', f: Ext.Array.sum }
    ],

    transform: {
        method: "aggregate",
        config: [
            { field: 'ObjectID', f: '$count' },
            { as: 'Drill-down', field:'ObjectID', f:'$push' },
            { field: 'PlanEstimate', f: '$sum' },
            { as: 'mySum', field: 'PlanEstimate', f: function(values){
                return Ext.Array.sum(values);
              }
            },
            { as: 'simplerSum', field: 'PlanEstimate', f: Ext.Array.sum }
        ]
    },



    onAggregationLoad: function(store, records){
        //do stuff
    }



*/
