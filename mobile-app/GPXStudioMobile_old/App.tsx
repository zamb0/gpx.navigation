/**
 * GPX Studio Mobile App Entry Point
 */

import React from 'react';
import { StatusBar, View, Text } from 'react-native';

const App: React.FC = () => {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <StatusBar barStyle="default" />
            <Text>GPX Studio Mobile</Text>
            <Text>Setup completato!</Text>
        </View>
    );
};

export default App;
