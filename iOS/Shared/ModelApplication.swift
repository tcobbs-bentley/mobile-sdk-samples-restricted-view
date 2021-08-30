//
//  ModelApplication.swift
//  MobileStarter
//
//  Created by Travis Local on 8/10/21.
//

import UIKit
import WebKit
import ITwinMobile
import PromiseKit
import UniformTypeIdentifiers

class ModelApplication: ITMApplication {
    required init() {
        super.init()
        registerQueryHandler("didFinishLaunching") { () -> Promise<()> in
            self.itmMessenger.frontendLaunchSuceeded()
            return Promise.value(())
        }
        registerQueryHandler("loading") { () -> Promise<()> in
            self.webView.isHidden = false
            return Promise.value(())
        }
        registerQueryHandler("reload") { () -> Promise<()> in
            self.webView.reload()
            return Promise.value(())
        }
        registerQueryHandler("getBimDocuments") { () -> Promise<[String]> in
            return Promise.value(self.getBimDocuments())
        }
    }
    
    override func viewWillAppear(viewController: ITMViewController) {
        viewController.itmNativeUI?.addComponent(DocumentPicker(viewController: viewController, itmMessenger: ITMViewController.application.itmMessenger))
    }
    
    func getBimDocuments() -> [String] {
        return getDocumentsWith(extension: "bim")
    }
    
    func getDocumentsWith(extension matchExtension: String) -> [String] {
        let fm = FileManager.default
        let lcMatchExtension = matchExtension.lowercased()
        let documentsDirs = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
        if documentsDirs.count < 1 {
            return []
        }
        let documentsDir = documentsDirs[0]
        if let allDocuments = try? fm.contentsOfDirectory(atPath: documentsDir) {
            var bimDocuments: [String] = []
            let nsDocumentsDir = NSString(string: documentsDir)
            for document in allDocuments {
                print("document: \(document)")
                let ext = NSString(string: document).pathExtension
                if ext.lowercased() == lcMatchExtension {
                    bimDocuments.append(nsDocumentsDir.appendingPathComponent(document))
                }
            }
            return bimDocuments
        }
        return []
    }
}