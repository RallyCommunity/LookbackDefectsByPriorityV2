Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    items:[
        {
            xtype: 'panel',
            itemId: 'chartHolder',
            layout: 'fit',
            height: 350,
            margin: '0 0 200 0'
        }
    ],

    launch: function() {
        var endDate = new Date();//Rally.util.DateTime.fromIsoString('2012-06-01T00:00:00Z');
        var startDate = Rally.util.DateTime.add(endDate, 'month', -3);
        var workspaceOID = this.getContext().getWorkspace().ObjectID;
        var projectOID = this.getContext().getProject().ObjectID;
        var chartConfig = {
            xtype: 'rallydefectsbyprioritychart',
            defectsByPriorityConfig: {
                startDate: startDate,
                endDate: endDate
            },

            context: {
                workspace: ('/workspace/'+ workspaceOID),
                project: ('/project/'+ projectOID)
            }
        };

        var chartHolder = this.down('#chartHolder');
        chartHolder.add(chartConfig);
    }
});
