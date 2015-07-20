var app = angular.module('paxosSimApp', ['ngAnimate']);

app.controller('BodyController', ['$scope', '$interval', function($scope, $interval) {
    // Just a counter to give our messages unique ids. Not needed for Paxos, but used for some Javascript hacks
    var messageId = 0;

    // Reset the system
    $scope.reset = function() {
        $scope.clusterState = "No quorum"

        $scope.nodes = [
         {node: "0", ballet: 0, value: "", msgs: [], nextMsgs: [], color:{'background-color':'#FF3333'}},
         {node: "1", ballet: 0, value: "", msgs: [], nextMsgs: [], color: {'background-color':'#33FFFF'}},
         {node: "2", ballet: 0, value: "", msgs: [], nextMsgs: [], color: {'background-color':'#66FF66'}},
         {node: "3", ballet: 0, value: "", msgs: [], nextMsgs: [], color: {'background-color':'#FFFF33'}},
         {node: "4", ballet: 0, value: "", msgs: [], nextMsgs: [], color: {'background-color':'#FF9966'}}
        ];

        $scope.balletCounter = 1;
    }
    $scope.reset();

    // Handle keypresses
    $scope.handleKeyPresses = function(event) {
        if (event.which === 115) {
            // Step all on 's'
            $scope.stepAllNodes();
        }
        if (event.which === 114) {
           // Reset on 'r'
           $scope.reset()
        }
    }

    // Causes proposer at index 'proposer' to propose a value
    $scope.propose = function(valueToPropose, proposer) {
        var b = $scope.balletCounter;
        $scope.balletCounter++;
        // Prepare phase
        for (var i = 0; i < $scope.nodes.length; i++) {
            var node = $scope.nodes[i];
            node.nextMsgs.push({source: proposer, type: "PREPARE", ballet: b});
        }
        $scope.nodes[proposer].proposeState = {ballet: b, highestBalletResponse: 0, promises: 0, quorum: false, proposal: valueToPropose};
    }

    // Called to make a node process a message
    function processMessage(node, msg) {
        if (msg.type == "PREPARE") {
            if (msg.ballet > node.ballet) {
                $scope.nodes[msg.source].nextMsgs.push({source: node.node, type: "PROMISE", ballet: node.ballet, value: node.value});
                node.ballet = msg.ballet;
            }
        } else if (msg.type == "PROMISE") {
            if (node.proposeState && !node.proposeState.quorum) {
                if (msg.value && msg.ballet > node.proposeState.highestBalletResponse) {
                    node.proposeState.highestBalletResponse = msg.ballet;
                    node.proposeState.proposal = msg.value;
                }
                node.proposeState.promises++;
                if (node.proposeState.promises > $scope.nodes.length / 2) {
                    node.proposeState.quorum = true;
                }

                //If we got a quorum of responses
                if (node.proposeState.quorum) {
                    for (var i = 0; i < $scope.nodes.length; i++) {
                        var acceptNode = $scope.nodes[i];
                        acceptNode.nextMsgs.push({
                        source: node.node,
                        type: "ACCEPT",
                        value: node.proposeState.proposal,
                        ballet: node.proposeState.ballet});
                    }

                    // Delete our prposal state
                    node.proposeState = null;
                }
            }

        } else if (msg.type == "ACCEPT") {
            if(msg.ballet >= node.ballet) {
                node.value = msg.value;
                node.ballet = msg.ballet;
            }
        }
    }

    // Make all nodes process a message
    $scope.stepAllNodes = function() {
        for (var i = 0; i < $scope.nodes.length; i++) {
            var node = $scope.nodes[i];

            var msg = node.msgs.shift();

            if (msg) {
                processMessage(node, msg);
            }
        }

        // Copy the new messages to the msgs queue. This logic is so we can
        // enqueue messages during the step for nodes that haven't been stepped yet, without
        // the new messages being processed in the wrong logical step.
        for (var i = 0; i < $scope.nodes.length; i++) {
            var node = $scope.nodes[i];

            var mv = node.nextMsgs.shift();
            while (mv) {
                mv.messageId = "msg" + messageId;
                messageId++;
                node.msgs.push(mv);
                mv = node.nextMsgs.shift();
            }
         }

        // Update the cluster state
        var votes = {};
        for (var i = 0; i < $scope.nodes.length; i++) {
            var node = $scope.nodes[i];
            if (node.value != "") {
                if (votes[node.value]) {
                    votes[node.value]++;
                } else {
                    votes[node.value] = 1;
                }
            }
        }


        for (vote in votes) {
            if (votes[vote] > ($scope.nodes.length / 2)) {
                $scope.clusterState = "Quorum on value " + vote;
            }
        }
    }

    $scope.dropMessage = function (node, msg) {
        $("." + msg.messageId).toggle( "explode" , {pieces: 30 }, 1000);

        var index = node.msgs.indexOf(msg);
        node.msgs.splice(index, 1);
    }

}]);