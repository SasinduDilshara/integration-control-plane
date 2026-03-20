import ballerina/lang.runtime;

public function main() returns error? {
    if ldapUserStoreEnabled {
        check ldapAuthServiceListener.attach(ldapUserService, "/");
        check ldapAuthServiceListener.'start();
        runtime:registerListener(ldapAuthServiceListener);
    }
}
