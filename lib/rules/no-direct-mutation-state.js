/**
 * @fileoverview Prevent direct mutation of this.state
 * @author David Petersen
 * @author Nicolas Fernandez <@burabure>
 */
'use strict';

const Components = require('../util/Components');

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    docs: {
      description: 'Prevent direct mutation of this.state',
      category: 'Possible Errors',
      recommended: true
    }
  },

  create: Components.detect((context, components, utils) => {
    /**
     * Checks if the component is valid
     * @param {Object} component The component to process
     * @returns {Boolean} True if the component is valid, false if not.
     */
    function isValid(component) {
      return Boolean(component && !component.mutateSetState);
    }

    /**
     * Reports undeclared proptypes for a given component
     * @param {Object} component The component to process
     */
    function reportMutations(component) {
      let mutation;
      for (let i = 0, j = component.mutations.length; i < j; i++) {
        mutation = component.mutations[i];
        context.report({
          node: mutation,
          message: 'Do not mutate state directly. Use setState().'
        });
      }
    }

    // --------------------------------------------------------------------------
    // Public
    // --------------------------------------------------------------------------
    let inConstructor = false;
    let inCallExpression = false;

    return {
      MethodDefinition(node) {
        if (node.kind === 'constructor') {
          inConstructor = true;
        }
      },

      CallExpression: function() {
        inCallExpression = true;
      },

      AssignmentExpression(node) {
        let item;
        if ((inConstructor && !inCallExpression) || !node.left || !node.left.object) {
          return;
        }
        item = node.left;
        while (item.object && item.object.property) {
          item = item.object;
        }
        if (
          item.object.type === 'ThisExpression' &&
          item.property.name === 'state'
        ) {
          const component = components.get(utils.getParentComponent());
          const mutations = (component && component.mutations) || [];
          mutations.push(node.left.object);
          components.set(node, {
            mutateSetState: true,
            mutations
          });
        }
      },

      'CallExpression:exit': function() {
        inCallExpression = false;
      },

      'MethodDefinition:exit': function (node) {
        if (node.kind === 'constructor') {
          inConstructor = false;
        }
      },

      'Program:exit': function () {
        const list = components.list();

        Object.keys(list).forEach(key => {
          if (!isValid(list[key])) {
            reportMutations(list[key]);
          }
        });
      }
    };
  })
};
