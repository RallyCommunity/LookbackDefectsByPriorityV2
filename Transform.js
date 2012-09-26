(function() {

    var Ext = window.Ext4 || window.Ext;

    /**
     * Utility class to provide data transformation convenience functions
     */
    Ext.define('Rally.data.util.Transform', {
        singleton:true,

        constructor: function(){
            this._ensureLumenizeLoaded();
        },

        _ensureLumenizeLoaded: function(){
            // highcharts and lumenize are disabled in ALM (only available in SDK), so this stops it blowing up
            if ( !(window._lumenize || Rally.data.lookback.Lumenize) ) { //TODO remove Rally.data.lookback.Lumenize
                // we're screwed
                throw new Error("Couldn't load necessary dependencies for AggregationStore, window._lumenize not in scope");
            }

            this._lumenize = window._lumenize || Rally.data.lookback.Lumenize; //TODO remove Rally.data.lookback.Lumenize
            //this._ChartTime = this._lumenize.ChartTime;
        },

//        /**
//         *
//         * @private
//         */
//        _onAfterLoadDependencies: function(){
//            this._lumenize = Rally.data.lookback.Lumenize;
//            this._ChartTime = this._lumenize.ChartTime;
//
//            var exposedFunctions = [
//                "aggregate", "aggregateAt", "groupBy", "groupByAt"
//            ];
//
//            for(var i= 0, l=exposedFunctions.length; i < l; ++i){
//                var name = exposedFunctions[i];
//                this[name] = function(){
//                    return this._lumenize[name].apply(this._lumenize, arguments);
//                }
//            }
//        },

        /**
         * Takes a list like this:
         *
         * list = [
         * { ObjectID: '1', KanbanState: 'In progress', PlanEstimate: 5, TaskRemainingTotal: 20 },
         * { ObjectID: '2', KanbanState: 'Ready to pull', PlanEstimate: 3, TaskRemainingTotal: 5 },
         * { ObjectID: '3', KanbanState: 'Ready to pull', PlanEstimate: 5, TaskRemainingTotal: 12 }
         * ]
         * and a list of aggregations like this:
         *
         * aggregations = [
         *  {field: 'ObjectID', f: '$count'}
         *  {as: 'Drill-down', field:'ObjectID', f:'$push'}
         *  {field: 'PlanEstimate', f: '$sum'}
         *  {as: 'mySum', field: 'PlanEstimate', f: (values) ->
         *      temp = 0
         *      for v in values
         *      temp += v
         *      return temp
         *  }
         * ]
         * and returns the aggregations like this:
         *
         * a = aggregate(list, aggregations)
         * console.log(a)
         *
         * #   { 'ObjectID_$count': 3,
         * #     'Drill-down': [ '1', '2', '3' ],
         * #     'PlanEstimate_$sum': 13,
         * #     mySum: 13 }
         * For each aggregation, you must provide a field and f (function) value. You can optionally provide an alias
         * for the aggregation with the 'as` field. There are a number of built in functions documented above.
         *
         * Alternatively, you can provide your own function (it takes one parameter, which is an Array of values to
         * aggregate) like the mySum example in our aggregations list above.
         *
         * @param dataArray The data to aggregate
         * @param aggregationSpec The details of the aggregation operations to perform
         * @return {Object} An object that holds the aggregation results
         */
        aggregate: function(dataArray, aggregationSpec){
            return this._lumenize.aggregate.apply(this._lumenize, arguments);
        },

        /*
         * Each entry in listOfDataArrays is passed to the aggregate function and the results are collected into a single
         * array output. This is essentially a wrapper around the aggregate function so the aggregationSpec parameter is the same.
         * @param listOfDataArrays An array of data arrays, each of which is to have a separate aggregation performed
         * @param aggregationSpec The details of the aggregation operations to perform
         * * @return {Array} An array of objects that holds the aggregation results for each entry in the listOfDataArrays
         */
        multiAggregate: function(listOfDataArrays, aggregationSpec){
            return this._lumenize.aggregateAt.apply(this._lumenize, arguments);
        },

        /**
         * Takes a list like this:
         *
         * list = [
         * { ObjectID: '1', KanbanState: 'In progress', PlanEstimate: 5, TaskRemainingTotal: 20 },
         * { ObjectID: '2', KanbanState: 'Ready to pull', PlanEstimate: 3, TaskRemainingTotal: 5 },
         * { ObjectID: '3', KanbanState: 'Ready to pull', PlanEstimate: 5, TaskRemainingTotal: 12 }
         * ]
         * and a groupBySpec like this:
         *
         * groupBySpec = {
         *  groupBy: 'KanbanState',
         *  aggregations: [
         *      {field: 'ObjectID', f: '$count'}
         *      {as: 'Drill-down', field:'ObjectID', f:'$push'}
         *      {field: 'PlanEstimate', f: '$sum'}
         *      {as: 'mySum', field: 'PlanEstimate', f: (values) ->
         *          temp = 0
         *          for v in values
         *          temp += v
         *          return temp
         *      }
         *  ]
         * }
         * Returns the aggregations like this:
         *
         * a = groupBy(list, groupBySpec)
         * console.log(a)
         *
         * # { 'In progress':
         * #     { 'ObjectID_$count': 1,
         * #       'Drill-down': [ '1' ],
         * #       'PlanEstimate_$sum': 5,
         * #       mySum: 5 },
         * #   'Ready to pull':
         * #     { 'ObjectID_$count': 2,
         * #       'Drill-down': [ '2', '3' ],
         * #       'PlanEstimate_$sum': 8,
         * #       mySum: 8 } }
         * The first element of this specification is the groupBy field. This is analogous to the GROUP BY column in an
         * SQL express.
         *
         * Uses the same aggregation functions at the aggregate function.
         *
         * @return {Object} A map of group names as keys to aggregation result objects
         */
        groupBy: function(dataArray, groupBySpec){
            return this._lumenize.groupBy.apply(this._lumenize, arguments);
        },

        /**
         * Each row in listOfDataArrays is passed to the groupBy function and the results are collected into a single
         * output.
         *
         * This function also finds all the unique groupBy values in all rows of the output and pads the output with
         * blank/zero rows to cover each unique groupBy value.
         *
         * This is essentially a wrapper around the groupBy function so the groupBySpec parameter is the same with the
         * addition of the uniqueValues field. The ordering specified in groupBySpec.uniqueValues (optional) will be
         * honored. Any additional unique values that it finds will be added to the uniqueValues list at the
         * end. This gives you the best of both worlds. The ability to specify the order without the risk of the data
         * containing more values than you originally thought when you created groupBySpec.uniqueValues.
         *
         * Note: multiGroupBy has the side-effect that groupBySpec.uniqueValues are upgraded with the missing values.
         * You can use this if you want to do more calculations at the calling site.
         *
         * @param listOfDataArrays  An array of data arrays, each of which is to have a separate groupBy performed
         * @param groupBySpec The details of the groupBy operations to perform
         * @return {Array} An array of objects that holds the groupBy results for each entry in the listOfDataArrays
         */
        multiGroupBy: function(listOfDataArrays, groupBySpec){
            return this._lumenize.groupByAt.apply(this._lumenize, arguments);
        }
    });

}());
